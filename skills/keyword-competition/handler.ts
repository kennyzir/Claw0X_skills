import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const HIGH_AUTHORITY_DOMAINS = new Set([
  'wikipedia.org', 'amazon.com', 'quora.com', 'reddit.com', 'forbes.com',
  'nytimes.com', 'medium.com', 'linkedin.com', 'youtube.com', 'github.com',
  'stackoverflow.com', 'bbc.com', 'cnn.com', 'techcrunch.com', 'wired.com',
  'theverge.com', 'arstechnica.com', 'hubspot.com', 'shopify.com', 'wordpress.org',
]);

interface CompetitionResult {
  keyword: string;
  scores: {
    ad_presence: number;
    authority_sites: number;
    content_depth: number;
    result_saturation: number;
    domain_diversity: number;
  };
  total_score: number;
  max_score: number;
  competition_level: 'low' | 'medium' | 'high';
  competition_emoji: string;
  opportunity_summary: string;
  top_results: Array<{
    position: number;
    title: string;
    url: string;
    domain: string;
    is_high_authority: boolean;
    snippet: string;
  }>;
  content_analysis: {
    avg_content_length: string;
    depth: 'thin' | 'medium' | 'deep';
    unique_domains: number;
    high_authority_count: number;
  };
  recommendation: {
    action: 'go' | 'differentiate' | 'avoid';
    strategy: string;
    suggested_word_count: number;
    content_angle: string;
  };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    keyword: { type: 'string', required: true, min: 2, max: 200 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  if (!TAVILY_API_KEY) {
    return errorResponse(res, 'Search API not configured', 500);
  }

  const { keyword } = validation.data!;

  try {
    const startTime = Date.now();

    // Fetch SERP data
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: keyword,
      search_depth: 'advanced',
      max_results: 10,
      include_answer: false,
    }, { timeout: 20000 });

    const results = response.data.results || [];

    // Analyze each result
    let highAuthCount = 0;
    let totalContentLen = 0;
    const domains = new Set<string>();

    const topResults = results.slice(0, 10).map((r: any, i: number) => {
      const domain = new URL(r.url).hostname.replace('www.', '');
      domains.add(domain);
      const isHighAuth = HIGH_AUTHORITY_DOMAINS.has(domain);
      if (isHighAuth) highAuthCount++;
      const contentLen = (r.content || '').length;
      totalContentLen += contentLen;

      return {
        position: i + 1,
        title: r.title || '',
        url: r.url,
        domain,
        is_high_authority: isHighAuth,
        snippet: (r.content || '').slice(0, 200),
      };
    });

    const avgContentLen = totalContentLen / Math.max(results.length, 1);
    const depth: 'thin' | 'medium' | 'deep' =
      avgContentLen < 200 ? 'thin' : avgContentLen < 500 ? 'medium' : 'deep';

    // Score each dimension (1-5)
    const scores = {
      ad_presence: 1, // Can't detect via Tavily
      authority_sites: Math.min(highAuthCount + 1, 5),
      content_depth: depth === 'thin' ? 1 : depth === 'medium' ? 3 : 5,
      result_saturation: Math.min(Math.ceil(results.length / 2), 5),
      domain_diversity: domains.size >= 8 ? 4 : domains.size >= 5 ? 3 : 2,
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const level: 'low' | 'medium' | 'high' =
      totalScore <= 10 ? 'low' : totalScore <= 17 ? 'medium' : 'high';

    const emoji = level === 'low' ? '🟢' : level === 'medium' ? '🟡' : '🔴';

    // Generate recommendation
    let action: 'go' | 'differentiate' | 'avoid';
    let strategy: string;
    let suggestedWordCount: number;
    let contentAngle: string;

    if (level === 'low') {
      action = 'go';
      strategy = 'Low competition — create comprehensive content and you can rank quickly.';
      suggestedWordCount = 1500;
      contentAngle = 'Be the definitive resource. Cover the topic thoroughly with examples and visuals.';
    } else if (level === 'medium') {
      action = 'differentiate';
      strategy = 'Medium competition — you need a unique angle or superior content depth to rank.';
      suggestedWordCount = 2500;
      contentAngle = 'Find a gap in existing content. Add original data, case studies, or a unique perspective.';
    } else {
      action = 'avoid';
      strategy = 'High competition — dominated by authority sites. Consider long-tail variations instead.';
      suggestedWordCount = 3000;
      contentAngle = 'Target a more specific long-tail variation of this keyword, or build topical authority first.';
    }

    const result: CompetitionResult = {
      keyword,
      scores,
      total_score: totalScore,
      max_score: 25,
      competition_level: level,
      competition_emoji: emoji,
      opportunity_summary: `${emoji} ${level.toUpperCase()} competition (${totalScore}/25). ${strategy}`,
      top_results: topResults,
      content_analysis: {
        avg_content_length: avgContentLen < 200 ? 'short' : avgContentLen < 500 ? 'medium' : 'long',
        depth,
        unique_domains: domains.size,
        high_authority_count: highAuthCount,
      },
      recommendation: {
        action,
        strategy,
        suggested_word_count: suggestedWordCount,
        content_angle: contentAngle,
      },
    };

    return successResponse(res, {
      ...result,
      _meta: {
        skill: 'keyword-competition',
        latency_ms: Date.now() - startTime,
        results_analyzed: results.length,
      },
    });
  } catch (error: any) {
    console.error('Keyword competition error:', error);
    return errorResponse(res, 'Competition analysis failed', 500, error.message);
  }
}

export default authMiddleware(handler);
