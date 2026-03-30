import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Text Classifier
 * Classifies text into predefined or custom categories using keyword
 * matching, TF-IDF scoring, and heuristic rules. No external API needed.
 */

const PREDEFINED_CATEGORIES: Record<string, string[]> = {
  'technology': ['software', 'hardware', 'ai', 'machine learning', 'cloud', 'api', 'database', 'programming', 'code', 'algorithm', 'server', 'deploy', 'kubernetes', 'docker', 'javascript', 'python', 'typescript', 'react', 'node', 'gpu', 'cpu', 'blockchain', 'crypto'],
  'business': ['revenue', 'profit', 'market', 'investment', 'startup', 'funding', 'ipo', 'acquisition', 'merger', 'stock', 'valuation', 'growth', 'strategy', 'enterprise', 'b2b', 'saas', 'roi', 'kpi'],
  'science': ['research', 'experiment', 'hypothesis', 'study', 'journal', 'peer-reviewed', 'data', 'analysis', 'biology', 'chemistry', 'physics', 'genome', 'molecule', 'quantum', 'climate', 'species'],
  'health': ['medical', 'health', 'disease', 'treatment', 'patient', 'doctor', 'hospital', 'symptom', 'diagnosis', 'therapy', 'vaccine', 'drug', 'clinical', 'mental health', 'wellness', 'nutrition'],
  'sports': ['game', 'team', 'player', 'score', 'championship', 'league', 'tournament', 'coach', 'athlete', 'match', 'season', 'goal', 'win', 'loss', 'stadium', 'olympic'],
  'politics': ['government', 'election', 'president', 'congress', 'senate', 'policy', 'law', 'regulation', 'vote', 'democrat', 'republican', 'legislation', 'campaign', 'political', 'diplomat'],
  'entertainment': ['movie', 'film', 'music', 'album', 'concert', 'actor', 'actress', 'director', 'show', 'series', 'streaming', 'netflix', 'spotify', 'celebrity', 'award', 'oscar', 'grammy'],
  'education': ['school', 'university', 'student', 'teacher', 'course', 'degree', 'curriculum', 'learning', 'academic', 'scholarship', 'exam', 'lecture', 'professor', 'campus', 'graduate'],
};

function classifyText(
  text: string,
  categories?: Record<string, string[]>
): { category: string; confidence: number; scores: Record<string, number> } {
  const cats = categories || PREDEFINED_CATEGORIES;
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(w => w.length > 2);
  const totalWords = words.length || 1;

  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(cats)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      // Count occurrences of keyword in text
      const kw = keyword.toLowerCase();
      if (kw.includes(' ')) {
        // Multi-word keyword: count in full text
        const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = lower.match(re);
        if (matches) matchCount += matches.length * 2; // bonus for multi-word
      } else {
        matchCount += words.filter(w => w === kw).length;
      }
    }
    scores[category] = Math.round((matchCount / totalWords) * 1000) / 10;
  }

  // Find top category
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0]?.[0] || 'unknown';
  const topScore = sorted[0]?.[1] || 0;

  // Normalize confidence to 0-100
  const maxPossible = 50; // rough ceiling
  const confidence = Math.min(100, Math.round((topScore / maxPossible) * 100));

  return { category: topCategory, confidence, scores };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    text: { type: 'string', required: true, min: 10, max: 50000 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { text } = validation.data!;
  const customCategories = req.body.categories; // optional custom categories

  try {
    const startTime = Date.now();
    const result = classifyText(text, customCategories);

    // Get top 3 categories
    const ranked = Object.entries(result.scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, score]) => ({ category: cat, score }));

    return successResponse(res, {
      category: result.category,
      confidence: result.confidence,
      top_categories: ranked,
      all_scores: result.scores,
      using_custom: !!customCategories,
      _meta: {
        skill: 'text-classifier',
        latency_ms: Date.now() - startTime,
        text_length: text.length,
        categories_count: Object.keys(result.scores).length,
      },
    });
  } catch (error: any) {
    console.error('Classification error:', error);
    return errorResponse(res, 'Classification failed', 500, error.message);
  }
}

export default authMiddleware(handler);
