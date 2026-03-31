import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Regex Match & Extract
 * Apply regex patterns to text, return all matches with groups and positions.
 * Supports flags (g, i, m, s), named groups, and multiple patterns.
 */

interface Match {
  match: string;
  index: number;
  groups: Record<string, string> | null;
  captures: string[];
}

function applyRegex(text: string, pattern: string, flags: string = 'g'): Match[] {
  if (!flags.includes('g')) flags += 'g';
  const re = new RegExp(pattern, flags);
  const matches: Match[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      match: m[0],
      index: m.index,
      groups: m.groups ? { ...m.groups } : null,
      captures: m.slice(1),
    });
    if (matches.length >= 1000) break;
  }
  return matches;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const { text, pattern, patterns, flags } = req.body || {};
  if (!text || typeof text !== 'string') return errorResponse(res, 'Missing required field: text', 400);
  if (!pattern && !patterns) return errorResponse(res, 'Missing required field: pattern or patterns', 400);
  if (text.length > 500000) return errorResponse(res, 'Text too long (max 500KB)', 400);

  try {
    const startTime = Date.now();

    if (patterns && Array.isArray(patterns)) {
      const results: Record<string, Match[]> = {};
      for (const p of patterns.slice(0, 20)) {
        const pat = typeof p === 'string' ? p : p.pattern;
        const fl = typeof p === 'string' ? (flags || 'g') : (p.flags || flags || 'g');
        try { results[pat] = applyRegex(text, pat, fl); } catch (e: any) { results[pat] = []; }
      }
      const totalMatches = Object.values(results).reduce((s, m) => s + m.length, 0);
      return successResponse(res, {
        results, total_matches: totalMatches, pattern_count: Object.keys(results).length,
        _meta: { skill: 'regex-match', latency_ms: Date.now() - startTime, text_length: text.length },
      });
    }

    try { new RegExp(pattern); } catch (e: any) {
      return errorResponse(res, `Invalid regex pattern: ${e.message}`, 400);
    }

    const matches = applyRegex(text, pattern, flags || 'g');
    return successResponse(res, {
      matches, total_matches: matches.length, pattern, flags: flags || 'g',
      _meta: { skill: 'regex-match', latency_ms: Date.now() - startTime, text_length: text.length },
    });
  } catch (error: any) {
    return errorResponse(res, 'Regex processing failed', 500, error.message);
  }
}

export default authMiddleware(handler);
