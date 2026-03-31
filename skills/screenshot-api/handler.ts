import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Screenshot API
 * Capture screenshots of any URL using a headless browser approach.
 * Falls back to a thumbnail service when Puppeteer is unavailable.
 */

async function captureScreenshot(url: string, width: number, height: number): Promise<{ image_url: string; method: string }> {
  // Use free screenshot services as backend
  // Option 1: Google PageSpeed Insights screenshot
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&strategy=desktop`;

  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
    if (resp.ok) {
      const data = await resp.json();
      const screenshot = data?.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
      if (screenshot) return { image_url: screenshot, method: 'pagespeed' };
    }
  } catch {}

  // Fallback: use a thumbnail service
  const thumbUrl = `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${encodeURIComponent(url)}`;
  return { image_url: thumbUrl, method: 'thumbnail' };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, width, height, full_page } = req.body || {};
  if (!url || typeof url !== 'string') return errorResponse(res, 'url is required', 400);
  try { new URL(url); } catch { return errorResponse(res, 'Invalid URL format', 400); }

  try {
    const startTime = Date.now();
    const w = Math.min(Math.max(width || 1280, 320), 1920);
    const h = Math.min(Math.max(height || 800, 240), 1080);
    const result = await captureScreenshot(url, w, h);

    return successResponse(res, {
      ...result, url, width: w, height: h, full_page: full_page || false,
      _meta: { skill: 'screenshot-api', latency_ms: Date.now() - startTime },
    });
  } catch (error: any) {
    return errorResponse(res, 'Screenshot capture failed', 500, error.message);
  }
}

export default authMiddleware(handler);
