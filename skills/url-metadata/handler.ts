import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * URL Metadata Fetcher
 * Fetches Open Graph tags, title, description, favicon, and canonical URL.
 * Used for link previews, content crawlers, and SEO tools.
 */

interface UrlMetadata {
  url: string;
  title: string | null;
  description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_type: string | null;
  og_site_name: string | null;
  twitter_card: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  favicon: string | null;
  canonical: string | null;
  language: string | null;
  author: string | null;
}

function extractMeta(html: string, name: string): string | null {
  // Try property= first (OG), then name=
  const propRe = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i');
  const match = html.match(propRe);
  if (match) return match[1];
  // Reverse order: content before property
  const revRe = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, 'i');
  const revMatch = html.match(revRe);
  return revMatch ? revMatch[1] : null;
}

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = html.match(re);
  return match ? match[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const re = /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i;
  const match = html.match(re);
  if (!match) return `${new URL(baseUrl).origin}/favicon.ico`;
  const href = match[1];
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return new URL(href, baseUrl).href;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    url: { type: 'string', required: true, min: 10, max: 2000 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { url } = validation.data!;

  try {
    new URL(url);
  } catch {
    return errorResponse(res, 'Invalid URL format', 400);
  }

  try {
    const startTime = Date.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Claw0x-URLMeta/1.0 (compatible; bot)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return errorResponse(res, `Failed to fetch URL: ${response.status}`, 400);
    }

    const html = await response.text();

    const metadata: UrlMetadata = {
      url: response.url, // final URL after redirects
      title: extractTag(html, 'title'),
      description: extractMeta(html, 'description'),
      og_title: extractMeta(html, 'og:title'),
      og_description: extractMeta(html, 'og:description'),
      og_image: extractMeta(html, 'og:image'),
      og_type: extractMeta(html, 'og:type'),
      og_site_name: extractMeta(html, 'og:site_name'),
      twitter_card: extractMeta(html, 'twitter:card'),
      twitter_title: extractMeta(html, 'twitter:title'),
      twitter_description: extractMeta(html, 'twitter:description'),
      twitter_image: extractMeta(html, 'twitter:image'),
      favicon: extractFavicon(html, response.url),
      canonical: extractMeta(html, 'canonical') || (() => {
        const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
        return m ? m[1] : null;
      })(),
      language: (() => {
        const m = html.match(/<html[^>]+lang=["']([^"']*)["']/i);
        return m ? m[1] : null;
      })(),
      author: extractMeta(html, 'author'),
    };

    return successResponse(res, {
      ...metadata,
      _meta: {
        skill: 'url-metadata',
        latency_ms: Date.now() - startTime,
        final_url: response.url,
        status_code: response.status,
      },
    });
  } catch (error: any) {
    console.error('URL metadata error:', error);
    return errorResponse(res, 'Failed to fetch URL metadata', 500, error.message);
  }
}

export default authMiddleware(handler);
