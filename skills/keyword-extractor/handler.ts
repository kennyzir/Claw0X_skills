import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Keyword Extractor
 * Extracts top keywords and keyphrases using TF-IDF scoring.
 * No external API needed — pure local computation.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'not', 'no', 'nor', 'as', 'if', 'then', 'than', 'too', 'very', 'just',
  'about', 'above', 'after', 'again', 'all', 'also', 'am', 'any', 'because',
  'before', 'between', 'both', 'each', 'few', 'get', 'got', 'here', 'into',
  'more', 'most', 'new', 'now', 'only', 'other', 'out', 'over', 'own',
  'same', 'so', 'some', 'still', 'such', 'take', 'there', 'through',
  'under', 'up', 'use', 'used', 'using', 'well', 'while',
]);

interface Keyword {
  term: string;
  score: number;
  count: number;
  type: 'word' | 'phrase';
}

function extractKeywords(text: string, maxKeywords: number = 20): Keyword[] {
  const lower = text.toLowerCase();
  const words = lower.match(/\b[a-z][a-z'-]*[a-z]\b|\b[a-z]\b/g) || [];
  const totalWords = words.length || 1;

  // Count word frequencies (excluding stop words)
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (STOP_WORDS.has(w) || w.length < 3) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  // TF scoring
  const tfScores: Keyword[] = Object.entries(freq)
    .map(([term, count]) => ({
      term,
      score: Math.round((count / totalWords) * 10000) / 100,
      count,
      type: 'word' as const,
    }))
    .sort((a, b) => b.score - a.score);

  // Extract bigrams (2-word phrases)
  const bigrams: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
    if (w1.length < 3 || w2.length < 3) continue;
    const phrase = `${w1} ${w2}`;
    bigrams[phrase] = (bigrams[phrase] || 0) + 1;
  }

  const phraseScores: Keyword[] = Object.entries(bigrams)
    .filter(([, count]) => count >= 2) // only phrases appearing 2+ times
    .map(([term, count]) => ({
      term,
      score: Math.round((count / totalWords) * 10000 * 1.5) / 100, // bonus for phrases
      count,
      type: 'phrase' as const,
    }))
    .sort((a, b) => b.score - a.score);

  // Merge and sort
  const all = [...phraseScores, ...tfScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);

  return all;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    text: { type: 'string', required: true, min: 20, max: 100000 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { text } = validation.data!;
  const maxKeywords = Math.min(req.body.max_keywords || 20, 50);

  try {
    const startTime = Date.now();
    const keywords = extractKeywords(text, maxKeywords);

    return successResponse(res, {
      keywords,
      total_keywords: keywords.length,
      top_words: keywords.filter(k => k.type === 'word').slice(0, 10).map(k => k.term),
      top_phrases: keywords.filter(k => k.type === 'phrase').slice(0, 5).map(k => k.term),
      _meta: {
        skill: 'keyword-extractor',
        latency_ms: Date.now() - startTime,
        text_length: text.length,
        word_count: text.split(/\s+/).length,
      },
    });
  } catch (error: any) {
    console.error('Keyword extraction error:', error);
    return errorResponse(res, 'Keyword extraction failed', 500, error.message);
  }
}

export default authMiddleware(handler);
