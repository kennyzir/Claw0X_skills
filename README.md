<p align="center">
  <img src="https://img.shields.io/badge/Claw0x-Skills-blue?style=for-the-badge" alt="Claw0x Skills" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000?style=for-the-badge&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/github/license/kennyzir/Claw0X_skills?style=for-the-badge" alt="License" />
</p>

<h1 align="center">Claw0x Skills</h1>

<p align="center">
  Open-source AI skill microservices. Build once, sell everywhere through the <a href="https://claw0x.com">Claw0x API Gateway</a>.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#available-skills">Skills</a> ·
  <a href="#free-skills">Free Skills</a> ·
  <a href="#build-your-own">Build Your Own</a> ·
  <a href="#sell-on-claw0x">Sell on Claw0x</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## What is this?

This repo contains production-ready **AI skill APIs** — small, focused microservices that do one thing well. Each skill is a single TypeScript file deployed as a serverless function.

Many skills are **completely free** — just [sign up at claw0x.com](https://claw0x.com), create an API key, and start calling. No credit card required. Fork them, use them in your agent pipelines, or build your own and **sell them on the [Claw0x skills layer](https://claw0x.com)** to earn revenue from every API call.

## Available Skills

| Skill | Endpoint | Description | Pricing | Status |
|-------|----------|-------------|---------|--------|
| Web Scraper | `/api/scrape` | Extract structured data (title, headings, links, images) from any URL | $0.005/call | Production |
| Email Validator | `/api/validate-email` | Validate email format, domain, and risk scoring | **Free** | Production |
| Sentiment Analyzer | `/api/sentiment` | Analyze text sentiment with confidence scoring | **Free** | Production |
| PDF Parser | `/api/parse-pdf` | Extract text and metadata from PDF documents | $0.005/call | Production |
| AI Humanizer | `/api/humanizer` | Remove AI writing patterns from text (24 pattern taxonomy) | Pay-per-call | Production |
| Translation | `/api/translate` | Translate text between 6+ languages | **Free** | Demo |
| Capability Evolver | `/api/capability-evolver` | Meta-skill for agent self-improvement via EvoMap Hub | $0.03/call | Production |
| Self-Improving Agent | `/api/self-improving-agent` | Capture learnings, errors, corrections for continuous improvement | **Free** | Production |
| Skill Scout | `/api/skill-scout` | Discover and recommend skills across Claw0x and community sources | **Free** | Production |
| Skills Archive | `/api/skills` | Browse and search the full Claw0x skill catalog | **Free** | Production |
| Tavily Search | `/api/tavily-search` | LLM-optimized web search with AI answer summaries | Freemium | Production |

## Free Skills

Several skills are **completely free to use** — no credit card, no wallet balance, no strings attached. Just get an API key and go.

**How to get started with free skills:**

1. Sign up at [claw0x.com](https://claw0x.com)
2. Go to Dashboard > API Keys > Create Key
3. Use the key to call any free skill via the API

**Free skills include:**

- **Sentiment Analyzer** — lexicon-based text sentiment analysis with word-level breakdown
- **Email Validator** — RFC format validation, domain analysis, and risk scoring
- **Self-Improving Agent** — structured error/correction/learning event processing for agent self-improvement
- **Skill Scout** — discover and recommend skills across Claw0x and community sources
- **Skills Archive** — browse and search the full skill catalog programmatically
- **Translation** — translate text between 6+ languages (demo)

**Freemium skills** (free daily quota, then pay-per-call):

- **Tavily Search** — 50 free calls/day, then $0.01/call

All free skills use the same API pattern as paid skills — same auth, same request format, same response structure. You can start with free skills and upgrade to paid ones as your needs grow.

```bash
# Example: call the free Sentiment Analyzer
curl -s -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skill": "sentiment", "input": {"text": "This product is amazing!"}}'
```

## Quick Start

```bash
# Clone
git clone https://github.com/kennyzir/Claw0X_skills.git
cd Claw0X_skills

# Install
npm install

# Configure
cp .env.example .env
# Edit .env — set SKILL_AUTH_TOKEN

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

Set `SKILL_AUTH_TOKEN` in Vercel Dashboard > Settings > Environment Variables. Done.

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
<summary><strong>Web Scraper</strong> — <code>POST /api/scrape</code></summary>

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
<summary><strong>Email Validator</strong> (Free) — <code>POST /api/validate-email</code></summary>

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
<summary><strong>Sentiment Analyzer</strong> (Free) — <code>POST /api/sentiment</code></summary>

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
<summary><strong>PDF Parser</strong> — <code>POST /api/parse-pdf</code></summary>

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
<summary><strong>Translation</strong> (Free) — <code>POST /api/translate</code></summary>

**Input:**
```json
{ "text": "hello", "target_lang": "zh" }
```

**Output:**
```json
{
  "success": true,
  "data": {
    "translated_text": "...",
    "source_lang": "en",
    "target_lang": "zh",
    "confidence": 0.95
  }
}
```

Supported languages: `es`, `fr`, `de`, `zh`, `ja`, `ko`
</details>

## Build Your Own Skill

Creating a new skill takes about 5 minutes. Every skill is a single file in the `skills/` directory.

```typescript
// skills/my-skill/handler.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

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

Deploy — your skill is live at `/api/my-skill`.

### Project Structure

```
Claw0X_skills/
├── api/
│   └── [skill].ts          # Dynamic router — routes to skill handlers
├── skills/                  # Each folder = one skill
│   ├── scrape/
│   │   ├── handler.ts       # Skill implementation
│   │   └── SKILL.md         # Skill documentation (detailed)
│   ├── sentiment/
│   ├── humanizer/
│   ├── validate-email/
│   └── ...
├── lib/                     # Shared utilities
│   ├── auth.ts              # Bearer token auth middleware
│   ├── validation.ts        # Input schema validation
│   └── response.ts          # Consistent JSON responses
├── vercel.json
├── package.json
└── tsconfig.json
```

### Built-in Utilities

The `lib/` directory gives you three things for free:

- **`authMiddleware(handler)`** — Wraps your handler with Bearer token auth + CORS + POST-only enforcement
- **`validateInput(body, schema)`** — Validates request body against a typed schema with min/max/pattern rules
- **`successResponse(res, data)` / `errorResponse(res, msg, code)`** — Consistent JSON response format

## Sell on Claw0x

Built something useful? List it on the [Claw0x skills layer](https://claw0x.com) and earn revenue from every API call.

**How it works:**

1. Build your skill (fork this repo or start fresh)
2. Deploy it anywhere (Vercel, AWS, your own server)
3. Submit it to [Claw0x](https://claw0x.com) — we handle billing, API keys, rate limiting, and distribution
4. Earn per-call revenue when developers use your skill through our gateway

**Pricing models available:**
- Free (great for adoption and ecosystem growth)
- Free tier + paid overage (freemium)
- Pay-per-call

> Skills listed on Claw0x get automatic discovery, SEO optimization, and exposure to thousands of AI agent developers — zero marketing effort on your end.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ideas for contributions:**
- New skills (OCR, code formatting, markdown conversion, etc.)
- Improve existing skills (better error handling, caching, etc.)
- Documentation improvements
- Tests

## Community

- [Claw0x Platform](https://claw0x.com)
- [Report Issues](https://github.com/kennyzir/Claw0X_skills/issues)
- [Discussions](https://github.com/kennyzir/Claw0X_skills/discussions)

## License

MIT — use it however you want. See [LICENSE](LICENSE).
