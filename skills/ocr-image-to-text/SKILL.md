---
name: "OCR Image to Text"
slug: "ocr-image-to-text"
description: >
  Extract text from images, screenshots, and scanned documents. Use when users
  need to digitize printed text, process receipts, read screenshots, or extract
  content from photos. Handles English text with confidence scoring.
category: "Document Processing"
tags: ["ocr", "image", "text-extraction", "document", "screenshot"]
price_per_call: 0.02
input_schema:
  type: object
  properties:
    image_url:
      type: string
      description: "Public URL of the image to process (max 10MB)"
    image_base64:
      type: string
      description: "Base64-encoded image data (with or without data URI prefix)"
    language:
      type: string
      description: "OCR language code (default: eng)"
output_schema:
  type: object
  properties:
    text:
      type: string
      description: "Full extracted text"
    confidence:
      type: number
      description: "OCR confidence score (0-100)"
    lines:
      type: array
      description: "Array of extracted text lines"
    line_count:
      type: number
    word_count:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# OCR Image to Text

Extract text from any image — screenshots, scanned documents, receipts, photos with text. Server-side processing using Tesseract OCR with confidence scoring.

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**:
   ```bash
   export CLAW0X_API_KEY="ck_live_..."
   ```

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Need text from screenshot | Send image URL or base64 | Full text + confidence |
| Processing receipts | Send receipt image | Extracted text + line count |
| Digitizing scanned docs | Send document image | Structured text output |
| Reading photos with text | Send photo URL | Text + word count |

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image_url` | string | No* | Public URL of image (max 10MB) |
| `image_base64` | string | No* | Base64-encoded image data |
| `language` | string | No | OCR language code (default: `eng`) |

*One of `image_url` or `image_base64` is required.

## Output Format

```json
{
  "success": true,
  "data": {
    "text": "Invoice #12345\nDate: 2026-03-30\nTotal: $150.00",
    "confidence": 92,
    "lines": ["Invoice #12345", "Date: 2026-03-30", "Total: $150.00"],
    "line_count": 3,
    "word_count": 6,
    "language": "eng",
    "_meta": {
      "skill": "ocr-image-to-text",
      "latency_ms": 1200,
      "image_source": "url"
    }
  }
}
```

## Example Usage

### Via Claw0x Gateway
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "ocr-image-to-text",
    "input": {
      "image_url": "https://example.com/receipt.png"
    }
  }'
```

### Via SDK
```typescript
const result = await claw0x.call('ocr-image-to-text', {
  image_url: 'https://example.com/screenshot.png'
});
console.log(result.data.text);
```

## Error Handling

| Code | Error | Cause |
|------|-------|-------|
| 400 | Missing image | Neither `image_url` nor `image_base64` provided |
| 400 | Image too large | Image exceeds 10MB limit |
| 400 | Failed to fetch | URL unreachable or invalid |
| 401 | Unauthorized | Missing or invalid API key |
| 500 | OCR processing failed | Internal processing error (not billed) |

## Pricing

**$0.02 per successful call.** Failed calls are free.

- Pay only for successful responses (2xx status)
- No monthly fees, no subscriptions
- Images up to 10MB supported
