import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * HTML to Markdown
 * Converts HTML content to clean Markdown for LLM consumption.
 * Strips scripts, styles, nav, ads. Preserves headings, links, lists, code.
 */

function htmlToMarkdown(html: string): string {
  let md = html;

  // Remove script, style, nav, footer, header tags and content
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  md = md.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  md = md.replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // Bold and italic
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // Links
  md = md.replace(/<a[^>]+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Images
  md = md.replace(/<img[^>]+src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]+alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img[^>]+src=["']([^"']*)["'][^>]*\/?>/gi, '![]($1)');

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // Paragraphs and line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Tables (basic)
  md = md.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, '| $1 ');
  md = md.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, '| $1 ');
  md = md.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, '$1|\n');

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const hasHtml = req.body?.html && typeof req.body.html === 'string';
  const hasUrl = req.body?.url && typeof req.body.url === 'string';

  if (!hasHtml && !hasUrl) {
    return errorResponse(res, 'Either html or url is required', 400);
  }

  try {
    const startTime = Date.now();
    let html: string;
    let sourceUrl: string | null = null;

    if (hasUrl) {
      const response = await fetch(req.body.url, {
        headers: { 'User-Agent': 'Claw0x-HTML2MD/1.0', 'Accept': 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        return errorResponse(res, `Failed to fetch URL: ${response.status}`, 400);
      }
      html = await response.text();
      sourceUrl = response.url;
    } else {
      html = req.body.html;
    }

    if (html.length > 5 * 1024 * 1024) {
      return errorResponse(res, 'HTML content too large (max 5MB)', 400);
    }

    const markdown = htmlToMarkdown(html);

    return successResponse(res, {
      markdown,
      char_count: markdown.length,
      line_count: markdown.split('\n').length,
      source: sourceUrl || 'inline',
      _meta: {
        skill: 'html-to-markdown',
        latency_ms: Date.now() - startTime,
        input_size: html.length,
        output_size: markdown.length,
      },
    });
  } catch (error: any) {
    console.error('HTML to Markdown error:', error);
    return errorResponse(res, 'Conversion failed', 500, error.message);
  }
}

export default authMiddleware(handler);
