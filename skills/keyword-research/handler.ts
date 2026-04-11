import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// --- Keyword Layer Model ---

type KeywordLayer = 'core' | 'mid_tail' | 'long_tail' | 'question';

interface ScoredKeyword {
  keyword: string;
  source: 'search_result' | 'ai_expansion' | 'competitor';
  layer: KeywordLayer;
  relevance_score: number;
}

interface SERPAnalysis {
  keyword: string;
  ad_count: number;
  high_authority_sites: number;
  content_depth: 'thin' | 'medium' | 'deep';
  competition_score: number; // 1-25
  competition_level: 'low' | 'medium' | 'high';
  top_results: Array<{ title: string; url: string; snippet: string }>;
}

interface KeywordReport {
  domain: string;
  site_analysis: {
    type: string;
    core_topics: string[];
    target_audience: string;
  };
  phase1_candidates: ScoredKeyword[];
  phase2_serp_analysis: SERPAnalysis[];
  phase3_top_keywords: Array<{
    keyword: string;
    layer: KeywordLayer;
    competition_score: number;
    competition_level: string;
    opportunity: string;
    recommended_action: string;
    landing_page: {
      title: string;
      core_points: string[];
      cta: string;
    };
  }>;
  summary: {
    total_candidates: number;
    analyzed: number;
    low_competition: number;
    medium_competition: number;
    high_competition: number;
  };
}

// --- Phase 1: Keyword Expansion ---

function expandKeywordsLocally(coreTopics: string[]): ScoredKeyword[] {
  const keywords: ScoredKeyword[] = [];

  for (const topic of coreTopics) {
    const t = topic.toLowerCase();

    // Product/tool expansions
    for (const suffix of ['tool', 'software', 'platform', 'service', 'generator', 'creator', 'free', 'online', 'app']) {
      keywords.push({ keyword: `${t} ${suffix}`, source: 'ai_expansion', layer: 'mid_tail', relevance_score: 0.7 });
    }

    // Question expansions
    for (const prefix of ['how to', 'what is', 'why use', 'best way to']) {
      keywords.push({ keyword: `${prefix} ${t}`, source: 'ai_expansion', layer: 'question', relevance_score: 0.6 });
    }

    // Comparison expansions
    for (const suffix of ['alternatives', 'vs', 'comparison', 'review', 'pricing']) {
      keywords.push({ keyword: `${t} ${suffix}`, source: 'ai_expansion', layer: 'mid_tail', relevance_score: 0.65 });
    }

    // Long-tail expansions
    const year = new Date().getFullYear();
    for (const suffix of [`${year}`, 'for beginners', 'for small business', 'tutorial', 'guide', 'examples']) {
      keywords.push({ keyword: `${t} ${suffix}`, source: 'ai_expansion', layer: 'long_tail', relevance_score: 0.55 });
    }

    // Core keyword itself
    keywords.push({ keyword: t, source: 'ai_expansion', layer: 'core', relevance_score: 1.0 });
  }

  return keywords;
}

async function enrichFromSearch(topics: string[]): Promise<ScoredKeyword[]> {
  if (!TAVILY_API_KEY) return [];

  const keywords: ScoredKeyword[] = [];

  for (const topic of topics.slice(0, 3)) {
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: TAVILY_API_KEY,
        query: topic,
        search_depth: 'basic',
        max_results: 10,
        include_answer: true,
      }, { timeout: 15000 });

      const results = response.data.results || [];

      // Extract keyword ideas from titles and content
      for (const r of results) {
        const title = (r.title || '').toLowerCase();
        if (title.length > 10 && title.length < 80) {
          keywords.push({
            keyword: title.replace(/[|–—\-:].*/g, '').trim(),
            source: 'search_result',
            layer: classifyLayer(title),
            relevance_score: r.score || 0.5,
          });
        }
      }

      // Extract from answer
      if (response.data.answer) {
        const phrases = extractPhrases(response.data.answer, topic);
        for (const phrase of phrases) {
          keywords.push({
            keyword: phrase,
            source: 'search_result',
            layer: classifyLayer(phrase),
            relevance_score: 0.6,
          });
        }
      }
    } catch {
      // Skip failed searches
    }
  }

  return keywords;
}

function classifyLayer(keyword: string): KeywordLayer {
  const kw = keyword.toLowerCase();
  if (/\b(how|what|why|when|where|which|can|should)\b/.test(kw)) return 'question';
  const wordCount = kw.split(/\s+/).length;
  if (wordCount <= 2) return 'core';
  if (wordCount <= 4) return 'mid_tail';
  return 'long_tail';
}

function extractPhrases(text: string, topic: string): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const topicWords = new Set(topic.toLowerCase().split(/\s+/));
  const phrases: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.toLowerCase().trim().split(/\s+/);
    if (words.length >= 3 && words.length <= 8) {
      const hasTopicWord = words.some(w => topicWords.has(w));
      if (hasTopicWord) {
        phrases.push(words.join(' '));
      }
    }
  }

  return phrases.slice(0, 5);
}

// --- Phase 2: SERP Analysis ---

async function analyzeSERP(keyword: string): Promise<SERPAnalysis | null> {
  if (!TAVILY_API_KEY) return null;

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: keyword,
      search_depth: 'advanced',
      max_results: 10,
      include_answer: false,
    }, { timeout: 15000 });

    const results = response.data.results || [];

    // Estimate competition signals from results
    const highAuthority = new Set(['wikipedia.org', 'amazon.com', 'quora.com', 'reddit.com', 'forbes.com', 'nytimes.com', 'medium.com']);
    let highAuthCount = 0;
    let totalContentLength = 0;

    const topResults = results.slice(0, 10).map((r: any) => {
      const domain = new URL(r.url).hostname.replace('www.', '');
      if (highAuthority.has(domain)) highAuthCount++;
      const contentLen = (r.content || '').length;
      totalContentLength += contentLen;

      return {
        title: r.title || '',
        url: r.url,
        snippet: (r.content || '').slice(0, 200),
      };
    });

    const avgContentLen = totalContentLength / Math.max(results.length, 1);
    const contentDepth: 'thin' | 'medium' | 'deep' =
      avgContentLen < 200 ? 'thin' : avgContentLen < 500 ? 'medium' : 'deep';

    // Competition scoring (5 dimensions, 1-5 each, total 5-25)
    const adScore = 1; // Can't detect ads via Tavily, assume low
    const authScore = Math.min(highAuthCount + 1, 5);
    const depthScore = contentDepth === 'thin' ? 1 : contentDepth === 'medium' ? 3 : 5;
    const resultScore = Math.min(Math.ceil(results.length / 2), 5);
    const diversityScore = new Set(results.map((r: any) => new URL(r.url).hostname)).size >= 8 ? 4 : 2;

    const competitionScore = adScore + authScore + depthScore + resultScore + diversityScore;
    const competitionLevel: 'low' | 'medium' | 'high' =
      competitionScore <= 10 ? 'low' : competitionScore <= 17 ? 'medium' : 'high';

    return {
      keyword,
      ad_count: 0,
      high_authority_sites: highAuthCount,
      content_depth: contentDepth,
      competition_score: competitionScore,
      competition_level: competitionLevel,
      top_results: topResults.slice(0, 5),
    };
  } catch {
    return null;
  }
}

// --- Phase 3: Top Keywords Selection ---

function selectTopKeywords(
  candidates: ScoredKeyword[],
  serpResults: SERPAnalysis[]
): KeywordReport['phase3_top_keywords'] {
  // Merge SERP data with candidates
  const serpMap = new Map(serpResults.map(s => [s.keyword, s]));

  const scored = serpResults
    .filter(s => s.competition_level !== 'high')
    .sort((a, b) => a.competition_score - b.competition_score)
    .slice(0, 3);

  return scored.map(s => {
    const year = new Date().getFullYear();
    return {
      keyword: s.keyword,
      layer: classifyLayer(s.keyword),
      competition_score: s.competition_score,
      competition_level: s.competition_level,
      opportunity: s.competition_level === 'low'
        ? 'Low competition — act immediately. Thin content in SERP, easy to outrank.'
        : 'Medium competition — differentiate with depth and freshness.',
      recommended_action: s.competition_level === 'low'
        ? `Create a comprehensive ${classifyLayer(s.keyword) === 'question' ? 'guide' : 'landing page'} targeting this keyword. Aim for 1500+ words with schema markup.`
        : `Create differentiated content with unique data or angle. Target 2000+ words.`,
      landing_page: {
        title: `${s.keyword} — ${classifyLayer(s.keyword) === 'question' ? 'Complete Guide' : 'Everything You Need to Know'} (${year})`,
        core_points: [
          `Comprehensive coverage of ${s.keyword}`,
          'Data-backed insights and comparisons',
          'Actionable steps and recommendations',
        ],
        cta: classifyLayer(s.keyword) === 'question' ? 'Read the Full Guide' : 'Get Started Now',
      },
    };
  });
}

// --- Site Analysis ---

async function analyzeSite(domain: string): Promise<{ type: string; core_topics: string[]; target_audience: string }> {
  if (!TAVILY_API_KEY) {
    return {
      type: 'unknown',
      core_topics: [domain.replace(/\.(com|io|net|org|co)$/, '')],
      target_audience: 'general',
    };
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: `site:${domain}`,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }, { timeout: 15000 });

    const results = response.data.results || [];
    const answer = response.data.answer || '';

    // Extract topics from titles
    const allText = results.map((r: any) => r.title).join(' ') + ' ' + answer;
    const words = allText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const freq: Record<string, number> = {};
    const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'more', 'about', 'will', 'been', 'also', 'just', 'than', 'them', 'very', 'when', 'what', 'some', 'into', 'only', 'other', 'could', 'would', 'their', 'which', 'each', 'make', 'like', 'over', 'such', 'take', 'most', 'these']);
    for (const w of words) {
      if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
    }

    const coreTopics = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([w]) => w);

    // Determine site type
    const typeSignals: Record<string, string[]> = {
      'SaaS/Tool': ['pricing', 'features', 'signup', 'dashboard', 'plan'],
      'Content/Media': ['blog', 'article', 'news', 'guide', 'tutorial'],
      'E-commerce': ['shop', 'product', 'cart', 'price', 'buy'],
      'Community/Forum': ['forum', 'discussion', 'community', 'thread'],
    };

    let siteType = 'Content/Media';
    let maxSignals = 0;
    for (const [type, signals] of Object.entries(typeSignals)) {
      const count = signals.filter(s => allText.toLowerCase().includes(s)).length;
      if (count > maxSignals) {
        maxSignals = count;
        siteType = type;
      }
    }

    return {
      type: siteType,
      core_topics: coreTopics.length > 0 ? coreTopics : [domain.split('.')[0]],
      target_audience: siteType === 'SaaS/Tool' ? 'developers and businesses' : 'general audience',
    };
  } catch {
    return {
      type: 'unknown',
      core_topics: [domain.split('.')[0]],
      target_audience: 'general',
    };
  }
}

// --- Main Handler ---

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    domain: { type: 'string', required: true, min: 3, max: 200 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  if (!TAVILY_API_KEY) {
    return errorResponse(res, 'Search API not configured', 500);
  }

  const rawDomain = validation.data!.domain;
  // Normalize domain
  const domain = rawDomain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

  const maxCandidates = Math.min(req.body.max_candidates || 30, 50);
  const maxAnalyze = Math.min(req.body.max_analyze || 10, 20);

  try {
    const startTime = Date.now();

    // Phase 1: Site analysis + keyword expansion
    const siteAnalysis = await analyzeSite(domain);
    const localKeywords = expandKeywordsLocally(siteAnalysis.core_topics);
    const searchKeywords = await enrichFromSearch(siteAnalysis.core_topics);

    // Deduplicate and score
    const seen = new Set<string>();
    const allCandidates: ScoredKeyword[] = [];
    for (const kw of [...searchKeywords, ...localKeywords]) {
      const normalized = kw.keyword.toLowerCase().trim();
      if (!seen.has(normalized) && normalized.length > 3) {
        seen.add(normalized);
        allCandidates.push(kw);
      }
    }

    // Sort by relevance and take top N
    const phase1 = allCandidates
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxCandidates);

    // Phase 2: SERP analysis on top candidates
    const toAnalyze = phase1
      .filter(k => k.source === 'search_result' || k.layer !== 'core')
      .slice(0, maxAnalyze);

    const serpPromises = toAnalyze.map(k => analyzeSERP(k.keyword));
    const serpResults = (await Promise.all(serpPromises)).filter(Boolean) as SERPAnalysis[];

    // Phase 3: Select top 3
    const phase3 = selectTopKeywords(phase1, serpResults);

    const report: KeywordReport = {
      domain,
      site_analysis: siteAnalysis,
      phase1_candidates: phase1,
      phase2_serp_analysis: serpResults,
      phase3_top_keywords: phase3,
      summary: {
        total_candidates: phase1.length,
        analyzed: serpResults.length,
        low_competition: serpResults.filter(s => s.competition_level === 'low').length,
        medium_competition: serpResults.filter(s => s.competition_level === 'medium').length,
        high_competition: serpResults.filter(s => s.competition_level === 'high').length,
      },
    };

    return successResponse(res, {
      ...report,
      _meta: {
        skill: 'keyword-research',
        latency_ms: Date.now() - startTime,
        phases_completed: 3,
      },
    });
  } catch (error: any) {
    console.error('Keyword research error:', error);
    return errorResponse(res, 'Keyword research failed', 500, error.message);
  }
}

export default authMiddleware(handler);
