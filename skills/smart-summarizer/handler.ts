import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

type SummaryStyle = 'brief' | 'bullet' | 'executive';

interface SummarySource {
  kind: 'text' | 'url' | 'document';
  title?: string;
  content: string;
  url?: string;
}

const MAX_INPUT_CHARS = 60000;
const DEFAULT_SENTENCE_LIMIT = 5;
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from',
  'had', 'has', 'have', 'he', 'her', 'his', 'if', 'in', 'into', 'is', 'it', 'its',
  'of', 'on', 'or', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was',
  'were', 'will', 'with', 'you', 'your', 'we', 'our', 'about', 'after', 'all',
  'also', 'any', 'because', 'before', 'between', 'can', 'could', 'each', 'many',
  'more', 'most', 'not', 'other', 'over', 'such', 'than', 'then', 'these', 'those',
  'through', 'under', 'use', 'using', 'used', 'very', 'what', 'when', 'where',
  'which', 'while', 'who', 'why', 'how'
]);

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeSentence(sentence: string): string {
  return sentence
    .replace(/\s+/g, ' ')
    .replace(/\[[^\]]{1,20}\]/g, '')
    .replace(/\(\s*\)/g, '')
    .trim();
}

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]{2,}/g);
  return matches || [];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\u3002\uff01\uff1f])\s+/u)
    .map(normalizeSentence)
    .filter(sentence => sentence.length >= 25);
}

function scoreSentences(sentences: string[]) {
  const freq = new Map<string, number>();

  for (const sentence of sentences) {
    for (const token of tokenize(sentence)) {
      if (STOPWORDS.has(token)) continue;
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }

  const scored = sentences.map((sentence, index) => {
    const tokens = tokenize(sentence).filter(token => !STOPWORDS.has(token));
    const baseScore = tokens.reduce((sum, token) => sum + (freq.get(token) || 0), 0);
    const density = tokens.length > 0 ? baseScore / tokens.length : 0;
    const positionalBoost = Math.max(0, 1.25 - index * 0.03);
    const lengthPenalty = sentence.length > 320 ? 0.8 : 1;

    return {
      index,
      sentence,
      score: density * positionalBoost * lengthPenalty,
    };
  });

  return scored;
}

function buildBullets(sentences: string[], maxItems: number): string[] {
  return sentences
    .slice(0, maxItems)
    .map(sentence => sentence.replace(/^[\-\*\d\.\)\s]+/, '').trim())
    .filter(Boolean);
}

function topKeywords(text: string, limit: number): string[] {
  const freq = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (STOPWORDS.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function inferStyle(input: any): SummaryStyle {
  const style = typeof input.style === 'string' ? input.style.toLowerCase() : '';
  if (style === 'bullet' || style === 'executive' || style === 'brief') return style;

  const summaryType = typeof input.summary_type === 'string' ? input.summary_type.toLowerCase() : '';
  if (summaryType === 'bullet') return 'bullet';
  if (summaryType === 'executive' || summaryType === 'action_items' || summaryType === 'research_digest') {
    return 'executive';
  }

  return 'brief';
}

function clampSentenceLimit(input: any): number {
  const explicit = typeof input.max_sentences === 'number' ? input.max_sentences : undefined;
  const maxLength = typeof input.max_length === 'number' ? input.max_length : undefined;

  if (explicit !== undefined) return Math.min(10, Math.max(2, Math.round(explicit)));
  if (maxLength !== undefined) {
    if (maxLength <= 160) return 2;
    if (maxLength <= 320) return 3;
    if (maxLength <= 600) return 5;
    return 7;
  }

  return DEFAULT_SENTENCE_LIMIT;
}

function extractInput(body: unknown): any {
  const requestBody = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const nested = requestBody.input;
  if (nested && typeof nested === 'object') {
    return nested;
  }
  return requestBody;
}

async function fetchUrlContent(url: string): Promise<SummarySource> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('INVALID_URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('INVALID_URL');
  }

  const response = await fetch(parsed.toString(), {
    headers: {
      'User-Agent': 'Claw0x-Smart-Summarizer/1.0',
      'Accept': 'text/html,text/plain;q=0.9,application/xhtml+xml;q=0.8'
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`URL_FETCH_FAILED:${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!body || body.trim().length === 0) {
    throw new Error('EMPTY_SOURCE');
  }

  const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? collapseWhitespace(stripHtml(titleMatch[1])) : undefined;
  const content = contentType.includes('text/html') ? stripHtml(body) : collapseWhitespace(body);

  return {
    kind: 'url',
    title,
    content,
    url: parsed.toString(),
  };
}

async function resolveSource(input: any): Promise<SummarySource> {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  const documentText = typeof input.document_text === 'string' ? input.document_text.trim() : '';
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : '';

  const provided = [text, documentText, url].filter(Boolean);
  if (provided.length !== 1) {
    throw new Error('ONE_SOURCE_REQUIRED');
  }

  if (text) {
    return { kind: 'text', title: title || undefined, content: collapseWhitespace(text) };
  }

  if (documentText) {
    return { kind: 'document', title: title || input.document_name || undefined, content: collapseWhitespace(documentText) };
  }

  return fetchUrlContent(url);
}

function createSummary(source: SummarySource, style: SummaryStyle, maxSentences: number, language?: string) {
  const truncated = source.content.slice(0, MAX_INPUT_CHARS);
  const sentences = splitSentences(truncated);

  if (sentences.length === 0) {
    throw new Error('INSUFFICIENT_TEXT');
  }

  const scored = scoreSentences(sentences);
  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(maxSentences, sentences.length))
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence);

  const bullets = buildBullets(selected, Math.min(6, maxSentences));
  const summaryText = style === 'bullet'
    ? bullets.map(item => `- ${item}`).join('\n')
    : selected.join(' ');

  const preview = sentences[0];
  const keywords = topKeywords(truncated, 8);
  const title = source.title || preview.slice(0, 80);

  return {
    title,
    summary: summaryText,
    bullets,
    key_points: bullets,
    source_type: source.kind,
    source_url: source.url || null,
    detected_language: language || 'auto',
    sentence_count_used: selected.length,
    original_sentence_count: sentences.length,
    original_characters: source.content.length,
    summarized_characters: summaryText.length,
    keywords,
    excerpt: preview,
  };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const input = extractInput(req.body);

  const startTime = Date.now();

  try {
    const source = await resolveSource(input);
    if (source.content.length > MAX_INPUT_CHARS * 2) {
      return errorResponse(res, `Input too large. Maximum supported source length is ${MAX_INPUT_CHARS * 2} characters.`, 400);
    }

    const style = inferStyle(input);
    const maxSentences = clampSentenceLimit(input);
    const language = typeof input.language === 'string' ? input.language.trim() : undefined;
    const result = createSummary(source, style, maxSentences, language);

    return successResponse(res, {
      ...result,
      _meta: {
        skill: 'smart-summarizer',
        version: '1.0.0',
        method: 'extractive',
        latency_ms: Date.now() - startTime,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'UNKNOWN_ERROR';

    if (message === 'ONE_SOURCE_REQUIRED') {
      return errorResponse(res, 'Provide exactly one source: text, document_text, or url', 400);
    }
    if (message === 'INVALID_URL') {
      return errorResponse(res, 'Invalid URL. Only http and https URLs are supported', 400);
    }
    if (message.startsWith('URL_FETCH_FAILED:')) {
      return errorResponse(res, 'Failed to fetch URL content', 502, message);
    }
    if (message === 'EMPTY_SOURCE' || message === 'INSUFFICIENT_TEXT') {
      return errorResponse(res, 'Not enough readable content to summarize', 400);
    }

    console.error('[smart-summarizer] Error:', message);
    return errorResponse(res, 'Summarization failed', 500, message);
  }
}

export const __testables = {
  clampSentenceLimit,
  createSummary,
  extractInput,
  fetchUrlContent,
  inferStyle,
};

export default authMiddleware(handler);
