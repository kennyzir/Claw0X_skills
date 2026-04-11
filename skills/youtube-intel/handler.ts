import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// --- Types ---

interface VideoResult {
  title: string;
  url: string;
  channel: string;
  snippet: string;
  content_type: 'review' | 'tutorial' | 'list' | 'comparison' | 'news' | 'other';
  is_short: boolean;
}

interface ChannelProfile {
  name: string;
  video_count: number;
  content_types: Record<string, number>;
  is_established: boolean;
}

interface SubCategoryAnalysis {
  name: string;
  search_query: string;
  videos: VideoResult[];
  channels: ChannelProfile[];
  competition: {
    total_videos: number;
    unique_channels: number;
    established_channels: number;
    level: 'low' | 'medium' | 'high' | 'blank';
    emoji: string;
  };
  opportunities: Array<{
    type: string;
    description: string;
    suggested_angle: string;
  }>;
}

// --- Content Type Classification ---

function classifyContentType(title: string): VideoResult['content_type'] {
  const t = title.toLowerCase();
  if (/\b(review|honest|worth\s+it|pros?\s+and\s+cons?)\b/.test(t)) return 'review';
  if (/\b(tutorial|how\s+to|step\s+by\s+step|guide|learn)\b/.test(t)) return 'tutorial';
  if (/\b(top\s+\d|best\s+\d|\d+\s+best|\d+\s+ways|\d+\s+tips)\b/.test(t)) return 'list';
  if (/\b(vs|versus|compared?|comparison|alternative)\b/.test(t)) return 'comparison';
  if (/\b(new|update|launch|announce|breaking|just\s+released)\b/.test(t)) return 'news';
  return 'other';
}

// --- Sub-Category Expansion ---

function expandCategory(category: string): string[] {
  const c = category.toLowerCase().trim();

  // Common category expansions
  const expansions: Record<string, string[]> = {
    'ai': ['AI image tools', 'AI coding tools', 'AI writing tools', 'AI video tools', 'AI voice tools', 'AI productivity tools'],
    'ai tools': ['AI image generator', 'AI code assistant', 'AI writing assistant', 'AI video editor', 'AI voice cloning'],
    'content creation': ['YouTube editing tools', 'thumbnail design', 'script writing', 'video SEO', 'content repurposing'],
    'gaming': ['game reviews', 'gaming setup', 'game tutorials', 'esports', 'indie games'],
    'programming': ['web development', 'mobile development', 'AI/ML development', 'DevOps tools', 'coding tutorials'],
  };

  // Check for exact or partial match
  for (const [key, subs] of Object.entries(expansions)) {
    if (c === key || c.includes(key)) return subs;
  }

  // Default: generate generic sub-categories
  return [
    `${category} tutorial`,
    `${category} review`,
    `best ${category}`,
    `${category} tips`,
    `${category} for beginners`,
  ];
}

// --- YouTube Search via Tavily ---

async function searchYouTube(query: string): Promise<VideoResult[]> {
  if (!TAVILY_API_KEY) return [];

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: `${query} site:youtube.com`,
      search_depth: 'basic',
      max_results: 10,
      include_answer: false,
    }, { timeout: 15000 });

    return (response.data.results || [])
      .filter((r: any) => r.url && r.url.includes('youtube.com'))
      .map((r: any) => {
        const title = r.title || '';
        // Try to extract channel from title pattern "Title - Channel"
        const parts = title.split(' - ');
        const channel = parts.length > 1 ? parts[parts.length - 1].trim() : 'Unknown';
        const videoTitle = parts.length > 1 ? parts.slice(0, -1).join(' - ').trim() : title;

        return {
          title: videoTitle,
          url: r.url,
          channel,
          snippet: (r.content || '').slice(0, 200),
          content_type: classifyContentType(videoTitle),
          is_short: r.url.includes('/shorts/'),
        };
      });
  } catch {
    return [];
  }
}

// --- Channel Aggregation ---

function aggregateChannels(videos: VideoResult[]): ChannelProfile[] {
  const channelMap = new Map<string, { videos: VideoResult[] }>();

  for (const v of videos) {
    const existing = channelMap.get(v.channel) || { videos: [] };
    existing.videos.push(v);
    channelMap.set(v.channel, existing);
  }

  return Array.from(channelMap.entries()).map(([name, data]) => {
    const contentTypes: Record<string, number> = {};
    for (const v of data.videos) {
      contentTypes[v.content_type] = (contentTypes[v.content_type] || 0) + 1;
    }

    return {
      name,
      video_count: data.videos.length,
      content_types: contentTypes,
      is_established: data.videos.length >= 3,
    };
  }).sort((a, b) => b.video_count - a.video_count);
}

// --- Competition Assessment ---

function assessCompetition(videos: VideoResult[], channels: ChannelProfile[]): SubCategoryAnalysis['competition'] {
  const established = channels.filter(c => c.is_established).length;

  let level: 'low' | 'medium' | 'high' | 'blank';
  if (videos.length < 3) {
    level = 'blank';
  } else if (established >= 5) {
    level = 'high';
  } else if (established >= 2) {
    level = 'medium';
  } else {
    level = 'low';
  }

  const emoji = level === 'low' ? '🟢' : level === 'medium' ? '🟡' : level === 'high' ? '🔴' : '⚪';

  return {
    total_videos: videos.length,
    unique_channels: channels.length,
    established_channels: established,
    level,
    emoji,
  };
}

// --- Opportunity Identification ---

function identifyOpportunities(videos: VideoResult[], channels: ChannelProfile[], competition: SubCategoryAnalysis['competition']): SubCategoryAnalysis['opportunities'] {
  const opportunities: SubCategoryAnalysis['opportunities'] = [];
  const contentTypes = videos.reduce((acc, v) => {
    acc[v.content_type] = (acc[v.content_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Format gap
  const allTypes = ['review', 'tutorial', 'list', 'comparison'];
  const missingTypes = allTypes.filter(t => !contentTypes[t] || contentTypes[t] < 2);
  if (missingTypes.length > 0) {
    opportunities.push({
      type: 'format_gap',
      description: `Missing content formats: ${missingTypes.join(', ')}`,
      suggested_angle: `Create ${missingTypes[0]} content — low competition in this format.`,
    });
  }

  // Blank market
  if (competition.level === 'blank') {
    opportunities.push({
      type: 'blank_market',
      description: 'Very few videos in this sub-category. Early mover advantage.',
      suggested_angle: 'Be the first comprehensive resource. Establish authority early.',
    });
  }

  // Low competition
  if (competition.level === 'low') {
    opportunities.push({
      type: 'low_competition',
      description: 'Few established channels. Room for new entrants.',
      suggested_angle: 'Consistent publishing (2-3 videos/week) can build authority quickly.',
    });
  }

  // Tutorial gap
  if (!contentTypes['tutorial'] || contentTypes['tutorial'] < 2) {
    opportunities.push({
      type: 'tutorial_gap',
      description: 'Few tutorial/how-to videos. High search intent for learning content.',
      suggested_angle: 'Create step-by-step tutorials with screen recordings.',
    });
  }

  return opportunities;
}

// --- Main Handler ---

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    category: { type: 'string', required: true, min: 2, max: 200 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  if (!TAVILY_API_KEY) {
    return errorResponse(res, 'Search API not configured', 500);
  }

  const { category } = validation.data!;
  const mode = req.body.mode || 'discovery';
  const maxSubCategories = Math.min(req.body.max_sub_categories || 5, 8);

  try {
    const startTime = Date.now();

    if (mode === 'discovery') {
      // Step 1: Expand category into sub-categories
      const subCategories = expandCategory(category).slice(0, maxSubCategories);

      // Step 2-5: Search, clean, analyze each sub-category
      const analyses: SubCategoryAnalysis[] = [];

      for (const sub of subCategories) {
        const videos = await searchYouTube(sub);
        const channels = aggregateChannels(videos);
        const competition = assessCompetition(videos, channels);
        const opportunities = identifyOpportunities(videos, channels, competition);

        analyses.push({
          name: sub,
          search_query: `${sub} site:youtube.com`,
          videos,
          channels,
          competition,
          opportunities,
        });
      }

      // Step 6: Rank by opportunity
      const ranked = analyses.sort((a, b) => {
        const levelOrder = { blank: 0, low: 1, medium: 2, high: 3 };
        return levelOrder[a.competition.level] - levelOrder[b.competition.level];
      });

      // Top opportunities across all sub-categories
      const topOpportunities = ranked
        .flatMap(a => a.opportunities.map(o => ({
          sub_category: a.name,
          competition: a.competition.emoji,
          ...o,
        })))
        .slice(0, 10);

      return successResponse(res, {
        mode: 'discovery',
        category,
        sub_categories_analyzed: ranked.length,
        analyses: ranked,
        top_opportunities: topOpportunities,
        summary: {
          total_videos: ranked.reduce((s, a) => s + a.videos.length, 0),
          total_channels: ranked.reduce((s, a) => s + a.channels.length, 0),
          competition_distribution: {
            blank: ranked.filter(a => a.competition.level === 'blank').length,
            low: ranked.filter(a => a.competition.level === 'low').length,
            medium: ranked.filter(a => a.competition.level === 'medium').length,
            high: ranked.filter(a => a.competition.level === 'high').length,
          },
        },
        _meta: {
          skill: 'youtube-intel',
          latency_ms: Date.now() - startTime,
          mode: 'discovery',
        },
      });
    } else if (mode === 'monitoring') {
      // Monitoring mode: search for a specific channel/topic
      const videos = await searchYouTube(category);
      const channels = aggregateChannels(videos);

      return successResponse(res, {
        mode: 'monitoring',
        query: category,
        videos,
        channels,
        total_videos: videos.length,
        content_type_distribution: videos.reduce((acc, v) => {
          acc[v.content_type] = (acc[v.content_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        _meta: {
          skill: 'youtube-intel',
          latency_ms: Date.now() - startTime,
          mode: 'monitoring',
        },
      });
    } else {
      return errorResponse(res, 'Invalid mode. Use "discovery" or "monitoring"', 400);
    }
  } catch (error: any) {
    console.error('YouTube intel error:', error);
    return errorResponse(res, 'YouTube intelligence failed', 500, error.message);
  }
}

export default authMiddleware(handler);
