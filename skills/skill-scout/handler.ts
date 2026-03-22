import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * skill-scout — Agent Skill Discovery & Recommendation
 *
 * Fetches live skill data from the Claw0x platform API (cached 5 min).
 * Both native Claw0x skills and community skills (synced from GitHub by
 * the discover-skills cron) live in the same DB and are returned together.
 * Community skills are identified by slug prefix "community-".
 *
 * Type: Live API (no hardcoded data)
 */

// ─── Types ───────────────────────────────────────────────────

interface CatalogSkill {
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  price_per_call: number;
  is_free: boolean;
  trust_score: number;
  total_calls: number;
  success_rate: number;
  install_cmd: string;
  api_call: string;
  is_community: boolean;
  browse_url: string | null;
}

interface SearchResult {
  name: string;
  description: string;
  category: string;
  tags: string[];
  relevance_score: number;
  source: 'claw0x' | 'community';
  install_cmd: string;
  pricing?: { price_per_call: number; is_free: boolean };
  trust_score?: number;
  api_call?: string;
  browse_url?: string;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

// ─── Live Catalog (fetched from API, cached 5 min) ──────────

const CLAW0X_API = process.env.CLAW0X_API_BASE || 'https://claw0x.com';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedCatalog: CatalogSkill[] = [];
let cacheTimestamp = 0;

async function fetchCatalog(): Promise<CatalogSkill[]> {
  if (cachedCatalog.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  try {
    const res = await fetch(`${CLAW0X_API}/api/skills?is_active=true`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = asArray(await res.json());

    cachedCatalog = data.map(s => {
      const isCommunity = (s.slug || '').startsWith('community-');
      return {
        name: s.name,
        slug: s.slug,
        description: s.description || '',
        category: s.category || 'Uncategorized',
        tags: Array.isArray(s.use_case_tags) ? s.use_case_tags : [],
        price_per_call: s.price_per_call ?? 0,
        is_free: (s.price_per_call ?? 0) === 0,
        trust_score: s.trust_score ?? 0,
        total_calls: s.total_calls ?? 0,
        success_rate: s.success_rate ?? 0,
        install_cmd: isCommunity
          ? `npx claw0x add ${s.slug.replace('community-', '')}`
          : `npx claw0x add ${s.slug}`,
        api_call: isCommunity
          ? ''
          : `POST /v1/call { "skill": "${s.slug}", "input": { ... } }`,
        is_community: isCommunity,
        browse_url: s.repo_url || null,
      };
    });
    cacheTimestamp = Date.now();
    return cachedCatalog;
  } catch (err: any) {
    console.warn('[skill-scout] API fetch failed, using cache:', err.message);
    return cachedCatalog;
  }
}

// ─── Search & Ranking ────────────────────────────────────────

function computeRelevance(query: string, name: string, description: string, tags: string[], category: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  let score = 0;
  if (name.toLowerCase().includes(query.toLowerCase())) score += 50;
  for (const t of terms) {
    if (tags.some(tag => tag.includes(t))) score += 30;
    if (category.toLowerCase().includes(t)) score += 20;
    if (description.toLowerCase().includes(t)) score += 10;
  }
  return Math.min(100, score);
}

function searchAll(catalog: CatalogSkill[], query?: string, category?: string, source?: string, limit: number = 10): SearchResult[] {
  const results: SearchResult[] = [];

  for (const s of catalog) {
    // Filter by source
    const skillSource = s.is_community ? 'community' : 'claw0x';
    if (source && source !== 'all' && source !== skillSource) continue;

    const relevance = query ? computeRelevance(query, s.name, s.description, s.tags, s.category) : 50;
    if (query && relevance === 0) continue;
    if (category && !s.category.toLowerCase().includes(category.toLowerCase())) continue;

    const result: SearchResult = {
      name: s.name,
      description: s.description,
      category: s.category,
      tags: s.tags,
      relevance_score: relevance,
      source: skillSource,
      install_cmd: s.install_cmd,
    };

    if (!s.is_community) {
      result.pricing = { price_per_call: s.price_per_call, is_free: s.is_free };
      result.trust_score = s.trust_score;
      result.api_call = s.api_call;
    } else {
      result.browse_url = s.browse_url || undefined;
    }

    results.push(result);
  }

  results.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
    return (b.trust_score || 0) - (a.trust_score || 0);
  });

  return results.slice(0, Math.min(limit, 50));
}

function getCategories(catalog: CatalogSkill[]): { name: string; claw0x_count: number; community_count: number }[] {
  const cats: Record<string, { claw0x: number; community: number }> = {};
  for (const s of catalog) {
    if (!cats[s.category]) cats[s.category] = { claw0x: 0, community: 0 };
    if (s.is_community) cats[s.category].community++;
    else cats[s.category].claw0x++;
  }
  return Object.entries(cats)
    .map(([name, c]) => ({ name, claw0x_count: c.claw0x, community_count: c.community }))
    .sort((a, b) => (b.claw0x_count + b.community_count) - (a.claw0x_count + a.community_count));
}

// ─── Handler ─────────────────────────────────────────────────

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    input: { type: 'object', required: true },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { input } = validation.data!;

  try {
    const startTime = Date.now();
    const catalog = await fetchCatalog();

    const query = input.query as string | undefined;
    const category = input.category as string | undefined;
    const source = input.source as string | undefined;
    const limit = typeof input.limit === 'number' ? input.limit : 10;
    const action = input.action as string | undefined;

    const claw0xCount = catalog.filter(s => !s.is_community).length;
    const communityCount = catalog.filter(s => s.is_community).length;

    let result: any;

    if (action === 'categories') {
      result = {
        categories: getCategories(catalog),
        total_claw0x: claw0xCount,
        total_community: communityCount,
      };
    } else if (action === 'recommend' && query) {
      const matches = searchAll(catalog, query, category, source, 3);
      result = {
        recommendation: matches.length > 0
          ? `Found ${matches.length} skill(s) for "${query}". Top pick: ${matches[0].name} (${matches[0].source}).`
          : `No skills found for "${query}". Try broader terms or browse categories.`,
        skills: matches,
        install_hint: matches.length > 0 ? matches[0].install_cmd : `npx claw0x search ${query || ''}`,
        query,
      };
    } else {
      const matches = searchAll(catalog, query, category, source, limit);
      result = {
        skills: matches,
        total: matches.length,
        catalog_size: { claw0x: claw0xCount, community: communityCount },
        query: query || null,
        category: category || null,
        source: source || 'all',
      };
    }

    const latencyMs = Date.now() - startTime;

    return successResponse(res, {
      ...result,
      _meta: {
        skill: 'skill-scout',
        latency_ms: latencyMs,
        data_source: 'live',
        cache_age_ms: cacheTimestamp > 0 ? Date.now() - cacheTimestamp : null,
      },
    });
  } catch (error: any) {
    console.error('[skill-scout] Error:', error.message);
    return errorResponse(res, 'Skill discovery failed', 500, error.message);
  }
}

export default authMiddleware(handler);
