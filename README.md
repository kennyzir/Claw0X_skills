<p align="center">
  <img src="https://img.shields.io/badge/Claw0x-Skills-blue?style=for-the-badge" alt="Claw0x Skills" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/github/license/kennyzir/000xxx_skills?style=for-the-badge" alt="License" />
</p>

<h1 align="center">Claw0x Skills</h1>

<p align="center">
  Open-source AI skill microservices. Build once, sell everywhere through the <a href="https://claw0x.com">Claw0x API Gateway</a>.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#available-skills">Skills</a> •
  <a href="#build-your-own">Build Your Own</a> •
  <a href="#sell-on-claw0x">Sell on Claw0x</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## What is this?

This repo contains production-ready **AI skill APIs** — small, focused microservices that do one thing well. Each skill is a single TypeScript file deployed as a serverless function.

**Use them for free**, fork them, or build your own and **sell them on the [Claw0x marketplace](https://claw0x.com)** to earn revenue from every API call.

## Available Skills

| Skill | Endpoint | Description | Status |
|-------|----------|-------------|--------|
| 🔍 Web Scraper | `/api/scrape` | Extract structured data (title, headings, links, images) from any URL | ✅ Production |
| 📧 Email Validator | `/api/validate-email` | Validate email format, domain, and risk scoring | ✅ Production |
| 💬 Sentiment Analyzer | `/api/sentiment` | Analyze text sentiment with confidence scoring | ✅ Production |
| 📄 PDF Parser | `/api/parse-pdf` | Extract text and metadata from PDF documents | ✅ Production |
| 🌐 Translation | `/api/translate` | Translate text between 6+ languages | 🔧 Demo |
| 🎨 Image Generator | `/api/generate-image` | Generate images from text prompts | 🔧 Placeholder |

## Quick Start

```bash
# Clone
git clone https://github.com/kennyzir/000xxx_skills.git
cd 000xxx_skills

# Install
npm install

# Configure
cp .env.example .env
# Edit .env → set SKILL_AUTH_TOKEN

# Run locally
npm run dev
```

Test it:

```bash
curl -X POST http://localhost:3000/api/sentiment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "This project is amazing!"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "sentiment": "very positive",
    "score": 4,
    "confidence": 40,
    "positive_words": ["amazing"],
    "negative_words": []
  }
}
```

## Deploy in 60 Seconds

```bash
npm i -g vercel
vercel login
vercel deploy --prod
```

Set `SKILL_AUTH_TOKEN` in Vercel Dashboard → Settings → Environment Variables. Done.

## API Reference

Every skill follows the same pattern:

```
POST /api/{skill-name}
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

All responses use a consistent format:

```json
{
  "success": true,
  "data": { ... }
}
```

<details>
<summary><strong>🔍 Web Scraper</strong> — <code>POST /api/scrape</code></summary>

**Input:**
```json
{ "url": "https://example.com" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "title": "Example Domain",
    "description": "...",
    "headings": { "h1": ["Example Domain"], "h2": [] },
    "links": [{ "text": "More information...", "href": "https://..." }],
    "images": [],
    "paragraphs": ["This domain is for use in illustrative examples..."]
  }
}
```
</details>

<details>
<summary><strong>📧 Email Validator</strong> — <code>POST /api/validate-email</code></summary>

**Input:**
```json
{ "email": "user@example.com" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "email": "user@example.com",
    "checks": { "format_valid": true, "domain": "example.com" },
    "risk_score": 10
  }
}
```
</details>

<details>
<summary><strong>💬 Sentiment Analyzer</strong> — <code>POST /api/sentiment</code></summary>

**Input:**
```json
{ "text": "I love this product!" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "sentiment": "positive",
    "score": 3,
    "confidence": 30,
    "positive_words": ["love"],
    "negative_words": []
  }
}
```
</details>

<details>
<summary><strong>📄 PDF Parser</strong> — <code>POST /api/parse-pdf</code></summary>

**Input:**
```json
{ "pdf_url": "https://example.com/doc.pdf" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "text": "Full extracted text...",
    "pages": 5,
    "word_count": 2500,
    "preview": "First 500 characters..."
  }
}
```
</details>

<details>
<summary><strong>🌐 Translation</strong> — <code>POST /api/translate</code></summary>

**Input:**
```json
{ "text": "hello", "target_lang": "zh" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "translated_text": "你好",
    "source_lang": "en",
    "target_lang": "zh",
    "confidence": 0.95
  }
}
```

Supported languages: `es`, `fr`, `de`, `zh`, `ja`, `ko`
</details>

## Build Your Own Skill

Creating a new skill takes about 5 minutes. Every skill is a single file in the `api/` directory.

```typescript
// api/my-skill.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../lib/auth';
import { validateInput } from '../lib/validation';
import { successResponse, errorResponse } from '../lib/response';

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    text: { type: 'string', required: true, min: 1, max: 5000 }
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { text } = validation.data!;

  // Your logic here
  const result = { processed: true, length: text.length };

  return successResponse(res, result);
}

export default authMiddleware(handler);
```

Deploy → your skill is live at `/api/my-skill`.

### Project Structure

```
000xxx_skills/
├── api/                    # Each file = one skill endpoint
│   ├── scrape.ts           # Web scraper
│   ├── validate-email.ts   # Email validation
│   ├── sentiment.ts        # Sentiment analysis
│   ├── parse-pdf.ts        # PDF text extraction
│   ├── translate.ts        # Translation
│   └── generate-image.ts   # Image generation
├── lib/                    # Shared utilities (use these!)
│   ├── auth.ts             # Bearer token auth middleware
│   ├── validation.ts       # Input schema validation
│   └── response.ts         # Consistent JSON responses
├── vercel.json             # Vercel config
├── package.json
└── tsconfig.json
```

### Built-in Utilities

The `lib/` directory gives you three things for free:

- **`authMiddleware(handler)`** — Wraps your handler with Bearer token auth + CORS + POST-only enforcement
- **`validateInput(body, schema)`** — Validates request body against a typed schema with min/max/pattern rules
- **`successResponse(res, data)` / `errorResponse(res, msg, code)`** — Consistent JSON response format

## Sell on Claw0x

Built something useful? List it on the [Claw0x marketplace](https://claw0x.com) and earn revenue from every API call.

**How it works:**

1. Build your skill (fork this repo or start fresh)
2. Deploy it anywhere (Vercel, AWS, your own server)
3. Submit it to [Claw0x](https://claw0x.com) — we handle billing, API keys, rate limiting, and distribution
4. Earn per-call revenue when developers use your skill through our gateway

**Pricing models available:**
- Free tier + paid overage (freemium)
- Pay-per-call
- Flat monthly subscription

> 💡 Skills on Claw0x get automatic discovery, SEO, and distribution to thousands of AI agent developers.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ideas for contributions:**
- 🆕 New skills (OCR, code formatting, markdown conversion, etc.)
- 🔧 Improve existing skills (better error handling, caching, etc.)
- 📖 Documentation improvements
- 🧪 Tests

## Community

- 🌐 [Claw0x Platform](https://claw0x.com)
- 🐛 [Report Issues](https://github.com/kennyzir/000xxx_skills/issues)
- 💬 [Discussions](https://github.com/kennyzir/000xxx_skills/discussions)

## License

MIT — use it however you want. See [LICENSE](LICENSE).
