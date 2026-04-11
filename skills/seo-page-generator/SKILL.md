---
name: "SEO Page Generator"
slug: "seo-page-generator"
description: >
  Generate SEO-optimized page structures from keywords. Use when you need to create
  landing pages, guide pages, comparison pages, or hub pages from trending keywords.
  Handles search intent classification, template selection, meta tag generation,
  schema markup, and SERP competitor analysis.
category: "SEO & Content"
tags: ["seo", "content-generation", "keyword-research", "page-structure", "schema-markup"]
price_per_call: 0.01
input_schema:
  type: object
  properties:
    keyword:
      type: string
      description: "Target keyword or search phrase"
    growth_rate:
      type: string
      description: "Optional trend growth rate (e.g. '+400%')"
    category:
      type: string
      description: "Optional content category"
    enrich:
      type: boolean
      description: "Enable SERP enrichment via search API (default: true)"
  required: ["keyword"]
output_schema:
  type: object
  properties:
    intent:
      type: object
      description: "Classified search intent with confidence score"
    template:
      type: object
      description: "Selected page template with sections and requirements"
    meta:
      type: object
      description: "Generated meta tags (title, description, OG)"
    schema_markup:
      type: object
      description: "JSON-LD schema markup for the page"
    content_outline:
      type: object
      description: "Page structure with H1, slug, and section outline"
    serp_data:
      type: object
      description: "SERP competitor data (when enrichment enabled)"
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# SEO Page Generator

Turn trending keywords into production-ready SEO page structures in seconds.

> **$0.01 per successful call.** Failed calls are free.

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Found a trending keyword | Send keyword + growth rate | Complete page blueprint |
| Need to create a landing page | Send target keyword | Intent-matched template + meta tags |
| Building content at scale | Batch keywords | Page structures with schema markup |
| Competitor research | Enable SERP enrichment | Top 5 competitors + related queries |

## 5-Minute Quickstart

### Step 1: Get API Key
Sign up at [claw0x.com](https://claw0x.com) → Dashboard → Create API Key

### Step 2: Make First Call
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer YOUR_CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "seo-page-generator",
    "input": {
      "keyword": "best AI writing tools 2026",
      "growth_rate": "+120%"
    }
  }'
```

### Step 3: Get Your Page Blueprint
```json
{
  "intent": {
    "type": "commercial",
    "confidence": 0.67,
    "signals": ["commercial: best|top|vs|..."]
  },
  "template": {
    "type": "comparison_page",
    "schema_type": "ItemList",
    "suggested_word_count": [1200, 2500],
    "required_elements": ["comparison_table", "rating_stars", "itemlist_schema", "cta_buttons"]
  },
  "meta": {
    "title": "best AI writing tools 2026 — Honest Comparison & Review (2026)",
    "description": "Compare the best AI writing tools 2026 options. Detailed pros & cons, pricing, and our honest recommendation."
  },
  "schema_markup": { "@context": "https://schema.org", "@type": "ItemList", "..." },
  "content_outline": {
    "h1": "best AI writing tools 2026",
    "slug": "best-ai-writing-tools-2026",
    "sections": [...]
  },
  "serp_data": {
    "people_also_ask": ["What is the best AI writing tool?", "..."],
    "top_competitors": [...]
  }
}
```

### Step 4: Build Your Page
Use the blueprint to generate your actual page content. The template, meta tags, and schema markup are ready to drop into your Next.js / Astro / Hugo project.

## How It Works

```
Keyword Input
    ↓
┌─────────────────────────┐
│ 1. Intent Classification │  ← Rule-based NLP (no LLM needed)
│    4 types: transactional, informational, commercial, navigational
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 2. Template Selection    │  ← Codes page / Guide / Comparison / Hub
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 3. Meta Tag Generation   │  ← Title, description, OG tags
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 4. Schema Markup         │  ← FAQPage / HowTo / ItemList / CollectionPage
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 5. SERP Enrichment       │  ← Competitor analysis, PAA, related searches
└─────────────────────────┘
    ↓
Complete Page Blueprint
```

## Real-World Use Cases

### Scenario 1: Capturing Trending Keywords
**Problem**: You found "yba codes" trending +400% on Google Trends but creating a page takes hours.
**Solution**: Send the keyword → get a transactional template with codes page structure, FAQ schema, and competitor data.
**Result**: Page blueprint in 2 seconds instead of 2 hours.

### Scenario 2: Content Site Scaling
**Problem**: You need to create 50 SEO pages for a new content site.
**Solution**: Batch your keyword list through the API → get intent-matched templates for each.
**Result**: 50 page blueprints with correct schema markup, meta tags, and content outlines.

### Scenario 3: Competitor Gap Analysis
**Problem**: You want to know what competitors rank for before creating content.
**Solution**: Enable SERP enrichment → get top 5 competitors, their titles, and content gaps.
**Result**: Data-driven content strategy instead of guesswork.

## Integration Recipes

### OpenClaw Agent
```typescript
import { Claw0xClient } from '@claw0x/sdk';

const claw0x = new Claw0xClient(process.env.CLAW0X_API_KEY);

// Generate page structure for a trending keyword
const result = await claw0x.call('seo-page-generator', {
  keyword: 'how to use Claude MCP',
  growth_rate: '+200%',
});

console.log(`Intent: ${result.data.intent.type}`);
console.log(`Template: ${result.data.template.type}`);
console.log(`H1: ${result.data.content_outline.h1}`);
```

### LangChain Agent
```python
import requests

response = requests.post(
    "https://api.claw0x.com/v1/call",
    headers={"Authorization": f"Bearer {CLAW0X_API_KEY}"},
    json={
        "skill": "seo-page-generator",
        "input": {"keyword": "best AI coding assistants", "enrich": True}
    }
)

blueprint = response.json()["data"]
print(f"Schema type: {blueprint['template']['schema_type']}")
```

### Batch Processing
```javascript
const keywords = ['AI writing tools', 'code review tools', 'project management AI'];

const blueprints = await Promise.all(
  keywords.map(keyword =>
    claw0x.call('seo-page-generator', { keyword, enrich: true })
  )
);

// Group by intent type
const byIntent = blueprints.reduce((acc, bp) => {
  const intent = bp.data.intent.type;
  (acc[intent] = acc[intent] || []).push(bp.data);
  return acc;
}, {});
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `keyword` | string | Yes | — | Target keyword (2-200 chars) |
| `growth_rate` | string | No | null | Trend growth rate (e.g. "+400%") |
| `category` | string | No | null | Content category hint |
| `enrich` | boolean | No | true | Enable SERP enrichment |

## Output Format

| Field | Type | Description |
|-------|------|-------------|
| `intent` | object | `{ type, confidence, signals }` |
| `template` | object | `{ type, schema_type, suggested_word_count, required_elements }` |
| `meta` | object | `{ title, description, og_title, og_description }` |
| `schema_markup` | object | Ready-to-use JSON-LD schema |
| `content_outline` | object | `{ h1, slug, suggested_path, sections[] }` |
| `internal_links` | string[] | Suggested internal link paths |
| `serp_data` | object/null | `{ people_also_ask, related_searches, top_competitors }` |
| `seo_checklist` | string[] | Page quality checklist |

## Search Intent Types

| Intent | Trigger Words | Template | Schema |
|--------|--------------|----------|--------|
| Transactional | codes, free, download, buy | Codes Page | FAQPage |
| Informational | how to, guide, tutorial | Guide Page | HowTo |
| Commercial | best, vs, review, compare | Comparison Page | ItemList |
| Navigational | wiki, list, directory, hub | Hub Page | CollectionPage |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Missing or invalid keyword | Provide keyword (2-200 chars) |
| 401 | Missing or invalid API key | Check your CLAW0X_API_KEY |
| 500 | Internal error (not billed) | Retry or contact support |

## Pricing

**$0.01 per successful call.** Failed calls are free.

- SERP enrichment included at no extra cost
- Pay only for successful responses (2xx status)
- No monthly fees, no subscriptions

## Why Use Via Claw0x?

- **Unified billing**: One API key for all skills
- **Atomic pricing**: Pay per call, not per month
- **Zero cost on failure**: Failed calls are never billed
- **Production-ready**: 99.9% uptime, low latency
- **Security scanned**: OSV.dev integration

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents — providing unified API access, atomic billing, and quality control.

**Explore more skills**: [claw0x.com/skills](https://claw0x.com/skills)
**GitHub**: [github.com/kennyzir/seo-page-generator](https://github.com/kennyzir/seo-page-generator)
