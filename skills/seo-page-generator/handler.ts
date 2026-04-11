import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// --- Search Intent Classification (rule-based, no LLM needed) ---

type SearchIntent = 'transactional' | 'informational' | 'navigational' | 'commercial';

interface IntentSignal {
  patterns: RegExp[];
  weight: number;
}

const INTENT_SIGNALS: Record<SearchIntent, IntentSignal> = {
  transactional: {
    patterns: [
      /\b(codes?|redeem|coupon|discount|free|download|buy|purchase|order|deal|promo)\b/i,
      /\b(generator|creator|maker|converter|calculator|tool)\b/i,
      /\b(sign\s*up|register|subscribe|login|get\s+started)\b/i,
    ],
    weight: 1.0,
  },
  informational: {
    patterns: [
      /\b(how\s+to|what\s+is|what\s+are|why\s+do|when\s+to|where\s+to)\b/i,
      /\b(guide|tutorial|learn|explain|definition|meaning|example)\b/i,
      /\b(tips|tricks|steps|ways|methods|techniques)\b/i,
    ],
    weight: 1.0,
  },
  commercial: {
    patterns: [
      /\b(best|top|vs|versus|comparison|compare|review|rating)\b/i,
      /\b(alternative|similar|like|cheap|affordable|premium)\b/i,
      /\b(worth\s+it|pros?\s+and\s+cons?|should\s+i)\b/i,
    ],
    weight: 1.0,
  },
  navigational: {
    patterns: [
      /\b(wiki|list|all|directory|index|catalog|hub|official)\b/i,
      /\b(tier\s+list|ranking|leaderboard|database|archive)\b/i,
      /\b(discord|reddit|forum|community|site|website)\b/i,
    ],
    weight: 0.8,
  },
};

function classifyIntent(keyword: string): { intent: SearchIntent; confidence: number; signals: string[] } {
  const scores: Record<SearchIntent, number> = {
    transactional: 0,
    informational: 0,
    commercial: 0,
    navigational: 0,
  };
  const matchedSignals: string[] = [];

  for (const [intent, signal] of Object.entries(INTENT_SIGNALS)) {
    for (const pattern of signal.patterns) {
      if (pattern.test(keyword)) {
        scores[intent as SearchIntent] += signal.weight;
        matchedSignals.push(`${intent}: ${pattern.source}`);
      }
    }
  }

  // Default to informational if no strong signal
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { intent: 'informational', confidence: 0.4, signals: ['default: no strong signal'] };
  }

  const intent = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as SearchIntent;
  const confidence = Math.min(maxScore / 3, 1.0);

  return { intent, confidence: Math.round(confidence * 100) / 100, signals: matchedSignals };
}

// --- Template Selection ---

interface TemplateConfig {
  type: string;
  schema_type: string;
  suggested_word_count: [number, number];
  sections: string[];
  required_elements: string[];
}

const TEMPLATES: Record<SearchIntent, TemplateConfig> = {
  transactional: {
    type: 'codes_page',
    schema_type: 'FAQPage',
    suggested_word_count: [800, 1500],
    sections: [
      'Hero (keyword + value prop)',
      'Active Items / Codes Section',
      'Expired Items Section',
      'How to Redeem / Use',
      'FAQ Section',
      'Related Pages',
    ],
    required_elements: ['copy_button', 'status_badges', 'last_updated_timestamp', 'faq_schema'],
  },
  informational: {
    type: 'guide_page',
    schema_type: 'HowTo',
    suggested_word_count: [1500, 3000],
    sections: [
      'Hero (keyword + promise)',
      'Table of Contents',
      'Step-by-Step Guide',
      'Visual Aids / Screenshots',
      'Pro Tips',
      'FAQ Section',
      'Related Guides',
    ],
    required_elements: ['toc', 'numbered_steps', 'howto_schema', 'internal_links'],
  },
  commercial: {
    type: 'comparison_page',
    schema_type: 'ItemList',
    suggested_word_count: [1200, 2500],
    sections: [
      'Hero (keyword + comparison promise)',
      'Quick Comparison Table',
      'Detailed Reviews',
      'Pros & Cons',
      'Verdict / Recommendation',
      'FAQ Section',
    ],
    required_elements: ['comparison_table', 'rating_stars', 'itemlist_schema', 'cta_buttons'],
  },
  navigational: {
    type: 'hub_page',
    schema_type: 'CollectionPage',
    suggested_word_count: [600, 1200],
    sections: [
      'Hero (keyword + hub description)',
      'Category Cards Grid',
      'Search / Filter Bar',
      'Featured Items',
      'Breadcrumb Navigation',
      'Related Hubs',
    ],
    required_elements: ['card_grid', 'search_bar', 'breadcrumb_schema', 'category_links'],
  },
};

// --- Meta Tag Generation ---

function generateMeta(keyword: string, intent: SearchIntent): {
  title: string;
  description: string;
  og_title: string;
  og_description: string;
} {
  const year = new Date().getFullYear();
  const titleTemplates: Record<SearchIntent, string> = {
    transactional: `${keyword} (${year}) — All Active Codes & Rewards`,
    informational: `${keyword} — Complete Guide (${year})`,
    commercial: `${keyword} — Honest Comparison & Review (${year})`,
    navigational: `${keyword} — Complete Directory & Resources`,
  };

  const descTemplates: Record<SearchIntent, string> = {
    transactional: `Get all working ${keyword.toLowerCase()}. Updated daily with active codes, rewards, and redemption instructions. Bookmark this page.`,
    informational: `Learn ${keyword.toLowerCase()} with our step-by-step guide. Includes tips, screenshots, and expert advice for beginners and pros.`,
    commercial: `Compare the best ${keyword.toLowerCase()} options. Detailed pros & cons, pricing, and our honest recommendation.`,
    navigational: `Browse our complete ${keyword.toLowerCase()} directory. Find resources, tools, and links organized by category.`,
  };

  const title = titleTemplates[intent];
  const description = descTemplates[intent].slice(0, 160);

  return {
    title,
    description,
    og_title: title,
    og_description: description,
  };
}

// --- Schema Markup Generation ---

function generateSchemaMarkup(keyword: string, intent: SearchIntent, template: TemplateConfig): object {
  const baseSchema: any = {
    '@context': 'https://schema.org',
  };

  switch (intent) {
    case 'transactional':
      return {
        ...baseSchema,
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `What are the latest ${keyword}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `[Dynamic: list of active ${keyword}]`,
            },
          },
          {
            '@type': 'Question',
            name: `How do I redeem ${keyword}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: '[Dynamic: step-by-step redemption guide]',
            },
          },
        ],
      };
    case 'informational':
      return {
        ...baseSchema,
        '@type': 'HowTo',
        name: keyword,
        step: [
          { '@type': 'HowToStep', text: '[Dynamic: Step 1]' },
          { '@type': 'HowToStep', text: '[Dynamic: Step 2]' },
          { '@type': 'HowToStep', text: '[Dynamic: Step 3]' },
        ],
      };
    case 'commercial':
      return {
        ...baseSchema,
        '@type': 'ItemList',
        name: `Best ${keyword}`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '[Dynamic: Option 1]' },
          { '@type': 'ListItem', position: 2, name: '[Dynamic: Option 2]' },
          { '@type': 'ListItem', position: 3, name: '[Dynamic: Option 3]' },
        ],
      };
    case 'navigational':
      return {
        ...baseSchema,
        '@type': 'CollectionPage',
        name: keyword,
        hasPart: [
          { '@type': 'WebPage', name: '[Dynamic: Category 1]' },
          { '@type': 'WebPage', name: '[Dynamic: Category 2]' },
        ],
      };
    default:
      return baseSchema;
  }
}

// --- SERP Enrichment via Tavily ---

async function enrichWithSERP(keyword: string): Promise<{
  people_also_ask: string[];
  related_searches: string[];
  top_competitors: { title: string; url: string; snippet: string }[];
} | null> {
  if (!TAVILY_API_KEY) return null;

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: keyword,
      search_depth: 'advanced',
      max_results: 10,
      include_answer: true,
    }, { timeout: 15000 });

    const results = response.data.results || [];

    // Extract PAA-style questions from results
    const paaPatterns = /\b(how|what|why|when|where|which|can|do|does|is|are|should)\b/i;
    const people_also_ask = results
      .map((r: any) => r.title)
      .filter((t: string) => paaPatterns.test(t))
      .slice(0, 5);

    // Extract related terms from answer
    const related_searches = extractRelatedTerms(keyword, response.data.answer || '', results);

    const top_competitors = results.slice(0, 5).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: (r.content || '').slice(0, 200),
    }));

    return { people_also_ask, related_searches, top_competitors };
  } catch {
    return null;
  }
}

function extractRelatedTerms(keyword: string, answer: string, results: any[]): string[] {
  const allText = [answer, ...results.map((r: any) => r.title + ' ' + (r.content || ''))].join(' ');
  const words = allText.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const kwWords = new Set(keyword.toLowerCase().split(/\s+/));

  const freq: Record<string, number> = {};
  for (const w of words) {
    if (kwWords.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term]) => `${keyword} ${term}`);
}

// --- Internal Link Suggestions ---

function suggestInternalLinks(keyword: string, intent: SearchIntent): string[] {
  const suggestions: string[] = [];
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (intent === 'transactional') {
    suggestions.push(`/${slug}/`, `/${slug}-guide/`, `/all-codes/`);
  } else if (intent === 'informational') {
    suggestions.push(`/guides/${slug}/`, `/${slug}-tips/`, `/faq/${slug}/`);
  } else if (intent === 'commercial') {
    suggestions.push(`/reviews/${slug}/`, `/best-${slug}/`, `/compare/${slug}/`);
  } else {
    suggestions.push(`/${slug}/`, `/${slug}-directory/`, `/resources/${slug}/`);
  }

  return suggestions;
}

// --- Main Handler ---

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    keyword: { type: 'string', required: true, min: 2, max: 200 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { keyword } = validation.data!;
  const growth_rate = req.body.growth_rate || null;
  const category = req.body.category || null;
  const enrich = req.body.enrich !== false; // default true

  try {
    const startTime = Date.now();

    // 1. Classify search intent
    const intentResult = classifyIntent(keyword);

    // 2. Select template
    const template = TEMPLATES[intentResult.intent];

    // 3. Generate meta tags
    const meta = generateMeta(keyword, intentResult.intent);

    // 4. Generate schema markup
    const schema_markup = generateSchemaMarkup(keyword, intentResult.intent, template);

    // 5. Suggest internal links
    const internal_links = suggestInternalLinks(keyword, intentResult.intent);

    // 6. SERP enrichment (optional, uses Tavily)
    let serp_data = null;
    if (enrich) {
      serp_data = await enrichWithSERP(keyword);
    }

    // 7. Generate content outline
    const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const content_outline = {
      h1: keyword,
      slug,
      suggested_path: `/${slug}/`,
      sections: template.sections.map((section, i) => ({
        order: i + 1,
        heading: section,
        type: i === 0 ? 'hero' : 'content',
      })),
    };

    return successResponse(res, {
      keyword,
      growth_rate,
      category,
      intent: {
        type: intentResult.intent,
        confidence: intentResult.confidence,
        signals: intentResult.signals,
      },
      template: {
        type: template.type,
        schema_type: template.schema_type,
        suggested_word_count: template.suggested_word_count,
        required_elements: template.required_elements,
      },
      meta,
      schema_markup,
      content_outline,
      internal_links,
      serp_data,
      seo_checklist: [
        `Target keyword "${keyword}" in H1`,
        `Target keyword in first 100 words`,
        `Meta description: ${meta.description.length} chars (target: 150-160)`,
        `Suggested word count: ${template.suggested_word_count[0]}-${template.suggested_word_count[1]}`,
        'Add at least 3 internal links',
        `Include ${template.schema_type} schema markup`,
        'Add OG image',
        'Add "Last Updated" timestamp',
        'Include FAQ section',
      ],
      _meta: {
        skill: 'seo-page-generator',
        latency_ms: Date.now() - startTime,
        enriched: enrich && serp_data !== null,
      },
    });
  } catch (error: any) {
    console.error('SEO page generator error:', error);
    return errorResponse(res, 'Page generation failed', 500, error.message);
  }
}

export default authMiddleware(handler);
