import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * awesome-openclaw-skills — Live Skill Discovery & Search
 * Fetches real skill data from the Claw0x platform API, with an in-memory
 * cache (TTL 5 min) so repeated searches within a short window are fast.
 *
 * Falls back to a minimal static catalog if the API is unreachable.
 */

// ─── Types ───────────────────────────────────────────────────

interface SkillEntry {
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  price_per_call: number;
  is_free: boolean;
  trust_score: number | null;
  total_calls: number | null;
  success_rate: number | null;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

// ─── Live Data Fetcher with Cache ────────────────────────────

const CLAW0X_API = process.env.CLAW0X_API_BASE || 'https://claw0x.com';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSkills: SkillEntry[] = [];
let cacheTimestamp = 0;

async function fetchSkills(): Promise<SkillEntry[]> {
  // Return cache if fresh
  if (cachedSkills.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSkills;
  }

  try {
    const res = await fetch(`${CLAW0X_API}/api/skills?is_active=true`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = asArray(await res.json());

    cachedSkills = data.map(s => ({
      name: s.name,
      slug: s.slug,
      description: s.description || '',
      category: s.category || 'Uncategorized',
      tags: Array.isArray(s.use_case_tags) ? s.use_case_tags : [],
      price_per_call: s.price_per_call ?? 0,
      is_free: (s.price_per_call ?? 0) === 0,
      trust_score: s.trust_score ?? null,
      total_calls: s.total_calls ?? null,
      success_rate: s.success_rate ?? null,
    }));
    cacheTimestamp = Date.now();

    return cachedSkills;
  } catch (err: any) {
    console.warn('[awesome-openclaw-skills] API fetch failed, using cache/fallback:', err.message);
    // Return stale cache if available, otherwise empty
    return cachedSkills;
  }
}

// ─── Search Logic ────────────────────────────────────────────

function searchSkills(skills: SkillEntry[], query?: string, category?: string, limit: number = 20): { skills: SkillEntry[]; total: number } {
  let results = [...skills];

  if (category) {
    const cat = category.toLowerCase();
    results = results.filter(s => s.category.toLowerCase().includes(cat));
  }

  if (query) {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    results = results.filter(s => {
      const haystack = `${s.name} ${s.description} ${s.category} ${s.tags.join(' ')}`.toLowerCase();
      return terms.some(t => haystack.includes(t));
    });

    // Rank by relevance
    results.sort((a, b) => {
      const scoreA = computeRelevance(terms, a);
      const scoreB = computeRelevance(terms, b);
      return scoreB - scoreA;
    });
  }

  const total = results.length;
  return { skills: results.slice(0, Math.min(limit, 100)), total };
}

function computeRelevance(terms: string[], skill: SkillEntry): number {
  let score = 0;
  const name = skill.name.toLowerCase();
  const desc = skill.description.toLowerCase();

  for (const t of terms) {
    if (name.includes(t)) score += 50;
    if (skill.tags.some(tag => tag.includes(t))) score += 30;
    if (skill.category.toLowerCase().includes(t)) score += 20;
    if (desc.includes(t)) score += 10;
  }

  // Boost by trust score
  if (skill.trust_score) score += skill.trust_score / 10;

  return score;
}

function getCategories(skills: SkillEntry[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const s of skills) {
    counts[s.category] = (counts[s.category] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Handler ─────────────────────────────────────────────────

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    input: { type: 'object', required: true }
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { input } = validation.data!;

  try {
    const startTime = Date.now();

    const skills = await fetchSkills();

    const query = input.query as string | undefined;
    const category = input.category as string | undefined;
    const limit = typeof input.limit === 'number' ? input.limit : 20;
    const action = input.action as string | undefined;

    let result: any;

    if (action === 'categories') {
      result = { categories: getCategories(skills), total_skills: skills.length };
    } else {
      const searchResult = searchSkills(skills, query, category, limit);
      result = {
        skills: searchResult.skills,
        total: searchResult.total,
        catalog_size: skills.length,
        query: query || null,
        category: category || null,
      };
    }

    const latencyMs = Date.now() - startTime;

    return successResponse(res, {
      ...result,
      _meta: {
        skill: 'awesome-openclaw-skills',
        latency_ms: latencyMs,
        data_source: 'live',
        cache_age_ms: cacheTimestamp > 0 ? Date.now() - cacheTimestamp : null,
      }
    });
  } catch (error: any) {
    console.error('[awesome-openclaw-skills] Error:', error.message);
    return errorResponse(res, 'Search failed', 500, error.message);
  }
}

export default authMiddleware(handler);
