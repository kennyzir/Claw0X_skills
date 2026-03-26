import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_API_URL = 'https://api.exa.ai/search';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (!EXA_API_KEY) {
    return errorResponse(res, 'Exa API key not configured', 500);
  }

  const validation = validateInput(req.body, {
    query: { type: 'string', required: true, min: 1, max: 500 },
    search_type: { type: 'string', required: false },
    start_published_date: { type: 'string', required: false },
    end_published_date: { type: 'string', required: false },
    category: { type: 'string', required: false },
    num_results: { type: 'number', required: false, min: 1, max: 10 },
    include_domains: { type: 'array', required: false },
    exclude_domains: { type: 'array', required: false },
    use_autoprompt: { type: 'boolean', required: false },
    include_text: { type: 'boolean', required: false },
    text_length_limit: { type: 'number', required: false },
    highlights: { type: 'boolean', required: false },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const {
    query,
    search_type = 'neural',
    start_published_date,
    end_published_date,
    category,
    num_results = 5,
    include_domains,
    exclude_domains,
    use_autoprompt = true,
    include_text = false,
    text_length_limit,
    highlights = false,
  } = req.body;

  // Validate enum values
  const validSearchTypes = ['neural', 'keyword', 'auto'];
  const validCategories = ['company', 'research paper', 'news', 'github', 'tweet', 'pdf', 'personal site'];

  if (!validSearchTypes.includes(search_type)) {
    return errorResponse(res, `search_type must be one of: ${validSearchTypes.join(', ')}`, 400);
  }
  if (category && !validCategories.includes(category)) {
    return errorResponse(res, `category must be one of: ${validCategories.join(', ')}`, 400);
  }

  try {
    const startTime = Date.now();
    
    const exaPayload: Record<string, any> = {
      query,
      type: search_type,
      numResults: num_results,
      useAutoprompt: use_autoprompt,
      contents: {
        text: include_text,
      },
    };

    // Add text length limit if specified
    if (include_text && text_length_limit) {
      exaPayload.contents.textLengthLimit = text_length_limit;
    }

    // Add highlights if requested
    if (highlights) {
      exaPayload.contents.highlights = {
        numSentences: 3,
        highlightsPerUrl: 3,
      };
    }

    // Date filtering (Exa's unique advantage)
    if (start_published_date) {
      exaPayload.startPublishedDate = start_published_date;
    }
    if (end_published_date) {
      exaPayload.endPublishedDate = end_published_date;
    }

    // Content type filtering (Exa's unique advantage)
    if (category) {
      exaPayload.category = category;
    }

    // Domain filtering
    if (include_domains && include_domains.length > 0) {
      exaPayload.includeDomains = include_domains;
    }
    if (exclude_domains && exclude_domains.length > 0) {
      exaPayload.excludeDomains = exclude_domains;
    }

    const response = await fetch(EXA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EXA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exaPayload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      console.error('Exa API error:', error);
      return errorResponse(res, 'Exa API error', response.status, error);
    }

    const data = await response.json();

    // Normalize results for LLM consumption
    const normalizedResults = (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      published_date: r.publishedDate || null,
      author: r.author || null,
      score: r.score,
      text: r.text,
      highlights: r.highlights,
      summary: r.summary,
      category: category || null,
      domain: new URL(r.url).hostname,
    }));

    return successResponse(res, {
      results: normalizedResults,
      autoprompt_string: data.autopromptString,
      result_count: normalizedResults.length,
      _meta: {
        skill: 'exa-search',
        latency_ms: Date.now() - startTime,
        search_type,
        date_filtered: !!(start_published_date || end_published_date),
      },
    });
  } catch (error: any) {
    console.error('Exa search error:', error);
    return errorResponse(res, 'Search failed', 500, error.message);
  }
}

export default authMiddleware(handler);
