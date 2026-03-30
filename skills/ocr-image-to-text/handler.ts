import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * OCR Image to Text
 * Extracts text from images using Tesseract.js (server-side).
 * Supports: screenshots, scanned docs, receipts, photos with text.
 * Accepts: base64-encoded image or public image URL.
 */

async function extractTextFromBuffer(buffer: Buffer): Promise<{
  text: string;
  confidence: number;
  lines: string[];
  words: number;
}> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  const { data } = await worker.recognize(buffer);
  await worker.terminate();

  const lines = data.text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  return {
    text: data.text.trim(),
    confidence: Math.round(data.confidence),
    lines,
    words: data.text.trim().split(/\s+/).filter((w: string) => w.length > 0).length,
  };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    image_url: { type: 'string', required: false, max: 2000 },
    image_base64: { type: 'string', required: false },
    language: { type: 'string', required: false, max: 10 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { image_url, image_base64, language } = req.body;

  if (!image_url && !image_base64) {
    return errorResponse(res, 'Either image_url or image_base64 is required', 400);
  }

  try {
    let buffer: Buffer;

    if (image_base64) {
      // Strip data URI prefix if present
      const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 10 * 1024 * 1024) {
        return errorResponse(res, 'Image too large (max 10MB)', 400);
      }
    } else {
      // Fetch from URL
      const response = await fetch(image_url!, {
        headers: { 'User-Agent': 'Claw0x-OCR/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        return errorResponse(res, `Failed to fetch image: ${response.status}`, 400);
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        return errorResponse(res, 'Image too large (max 10MB)', 400);
      }
      buffer = Buffer.from(await response.arrayBuffer());
    }

    const startTime = Date.now();
    const result = await extractTextFromBuffer(buffer);
    const latency = Date.now() - startTime;

    return successResponse(res, {
      text: result.text,
      confidence: result.confidence,
      lines: result.lines,
      line_count: result.lines.length,
      word_count: result.words,
      language: language || 'eng',
      _meta: {
        skill: 'ocr-image-to-text',
        latency_ms: latency,
        image_source: image_url ? 'url' : 'base64',
      },
    });
  } catch (error: any) {
    console.error('OCR error:', error);
    return errorResponse(res, 'OCR processing failed', 500, error.message);
  }
}

export default authMiddleware(handler);
