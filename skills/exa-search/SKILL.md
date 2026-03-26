---
name: Exa Search
description: >
  Advanced web search with precise date filtering and content type selection. Use when
  you need academic papers, GitHub repositories, research content, or specific date ranges.
  Handles neural search (semantic understanding), keyword search, and content type filtering
  (research papers, GitHub, news, PDFs). Perfect for research, competitive analysis, and
  content discovery.
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Exa Search

**Cloud skill by [Claw0x](https://claw0x.com)** — powered by Claw0x Gateway API.

Advanced web search with precise date filtering, content type selection, and neural search. Perfect for research, competitive analysis, and specialized content discovery.

> **Requires Claw0x API key.** Sign up at [claw0x.com](https://claw0x.com) to get your key.

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**:
   ```bash
   # Add to ~/.openclaw/.env
   CLAW0X_API_KEY=ck_live_...
   ```

## Pricing

**$0.005 per successful call.** Failed calls are free.

- Pay only for successful responses (2xx status)
- No monthly fees, no subscriptions
- Get started with $5 free credit

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Need academic papers from specific dates | Use `category: "research paper"` + date range | Filtered research results |
| Find GitHub projects from 2024 | Use `category: "github"` + `start_published_date: "2024-01-01"` | Recent open-source projects |
| Semantic search for concepts | Use `search_type: "neural"` | Intent-based results |
| Exact keyword matching | Use `search_type: "keyword"` | Traditional search results |

## How It Works — Under the Hood

Exa is a next-generation search engine built specifically for AI agents and researchers. Unlike traditional search engines, Exa offers:

### 1. Neural Search (Semantic Understanding)

Exa's neural search understands query intent, not just keywords:
- **Query**: "papers about attention mechanisms improving transformers"
- **Traditional search**: matches keywords "attention", "mechanisms", "transformers"
- **Exa neural**: understands you want research on how attention improves transformer architecture

### 2. Precise Date Filtering

Unlike Tavily's coarse-grained time ranges (day/week/month/year), Exa supports exact dates:
- **Tavily**: `time_range: "month"` (last 30 days)
- **Exa**: `start_published_date: "2024-03-15"`, `end_published_date: "2024-03-22"` (exact 7-day window)

### 3. Content Type Filtering

Exa can restrict results to specific content types:
- **Research papers** — academic publications, arXiv, journals
- **GitHub** — open-source repositories and code
- **News** — news articles and press releases
- **PDFs** — PDF documents
- **Company sites** — corporate websites
- **Personal sites** — blogs and personal pages
- **Tweets** — Twitter/X posts

### 4. Autoprompt Optimization

Exa can automatically optimize your query for better results:
- Input: "transformer papers"
- Optimized: "research papers on transformer architecture improvements"

## Exa vs Tavily: When to Use Which?

| Feature | Tavily | Exa | Winner |
|---------|--------|-----|--------|
| **Date filtering** | time_range (coarse) | start/end date (precise) | 🏆 Exa |
| **Search mode** | basic/advanced (depth) | neural/keyword (algorithm) | 🏆 Exa |
| **Content types** | general/news | 7+ types (papers, GitHub, PDF) | 🏆 Exa |
| **AI answer** | ✅ Built-in | ❌ Not available | 🏆 Tavily |
| **Speed** | 1-2s (basic), 3-5s (advanced) | 2-3s | 🏆 Tavily |
| **Best for** | Quick lookups, news, general info | Research, analysis, specialized content | — |

**Use Tavily when**: You need a quick answer, general web search, or news lookup.

**Use Exa when**: You need precise date ranges, specific content types (papers, GitHub), or semantic search.

## Real-World Use Cases

### Scenario 1: Academic Research

**Problem**: Agent needs to find transformer architecture papers published in Q1 2024.

**Tavily limitation**:
```typescript
{ query: "transformer architecture", time_range: "year" }
// Returns papers from last 365 days (too broad)
```

**Exa solution**:
```typescript
{
  query: "transformer architecture improvements",
  category: "research paper",
  start_published_date: "2024-01-01",
  end_published_date: "2024-03-31",
  search_type: "neural"
}
// Returns only Q1 2024 research papers
```

### Scenario 2: GitHub Project Discovery

**Problem**: Find Rust web frameworks created in 2024.

**Exa solution**:
```typescript
{
  query: "rust web framework",
  category: "github",
  start_published_date: "2024-01-01",
  num_results: 10
}
```

### Scenario 3: Competitive Analysis

**Problem**: Find companies similar to a competitor.

**Exa solution**:
```typescript
{
  query: "AI agent platforms",
  category: "company",
  exclude_domains: ["competitor.com"],
  num_results: 10
}
```

### Scenario 4: News Tracking (Precise Dates)

**Problem**: Find AI regulation news from March 15-22, 2024.

**Tavily limitation**:
```typescript
{ query: "AI regulation", time_range: "week" }
// Returns last 7 days from today (not specific week)
```

**Exa solution**:
```typescript
{
  query: "AI regulation",
  category: "news",
  start_published_date: "2024-03-15",
  end_published_date: "2024-03-22"
}
// Returns exact date range
```

## Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | yes | — | Search query (1–500 chars) |
| `search_type` | string | no | `"neural"` | `"neural"`, `"keyword"`, or `"auto"` |
| `start_published_date` | string | no | — | ISO 8601 date: `"2024-01-01"` |
| `end_published_date` | string | no | — | ISO 8601 date: `"2024-12-31"` |
| `category` | string | no | — | Content type (see below) |
| `num_results` | number | no | `5` | Number of results (1–10) |
| `include_domains` | string[] | no | — | Only include these domains |
| `exclude_domains` | string[] | no | — | Exclude these domains |
| `use_autoprompt` | boolean | no | `true` | Auto-optimize query |
| `include_text` | boolean | no | `false` | Include full page text |
| `text_length_limit` | number | no | — | Max text length (chars) |
| `highlights` | boolean | no | `false` | Highlight key sentences |

### Content Categories

- `"company"` — Company websites
- `"research paper"` — Academic papers
- `"news"` — News articles
- `"github"` — GitHub repositories
- `"tweet"` — Twitter/X posts
- `"pdf"` — PDF documents
- `"personal site"` — Blogs and personal pages

### Search Types

- `"neural"` (default) — Semantic search, understands intent
- `"keyword"` — Traditional keyword matching
- `"auto"` — Automatically choose best mode

## Output Schema

```typescript
{
  results: Array<{
    title: string;              // Page title
    url: string;                // Page URL
    published_date: string | null;  // Publication date
    author: string | null;      // Author (if available)
    score: number;              // Relevance score (0-1)
    text?: string;              // Full text (if requested)
    highlights?: string[];      // Key sentences (if requested)
    summary?: string;           // Summary (if available)
    category: string | null;    // Content type
    domain: string;             // Domain name
  }>;
  autoprompt_string?: string;   // Optimized query
  result_count: number;         // Number of results
  _meta: {
    skill: "exa-search";
    latency_ms: number;
    search_type: string;
    date_filtered: boolean;
  };
}
```

## Integration Recipes

### OpenClaw Agent

```typescript
import { Claw0xClient } from '@claw0x/sdk';

const claw0x = new Claw0xClient(process.env.CLAW0X_API_KEY);

// Research papers from specific date range
const papers = await claw0x.call('exa-search', {
  query: 'large language model reasoning',
  category: 'research paper',
  start_published_date: '2024-01-01',
  end_published_date: '2024-03-31',
  search_type: 'neural',
  num_results: 10
});

console.log(`Found ${papers.result_count} papers`);
papers.results.forEach(paper => {
  console.log(`${paper.title} (${paper.published_date})`);
  console.log(paper.url);
});
```

### LangChain Agent (Python)

```python
from claw0x import Claw0xClient

client = Claw0xClient(api_key=os.environ['CLAW0X_API_KEY'])

# Find GitHub projects
repos = client.call('exa-search', {
    'query': 'rust web framework',
    'category': 'github',
    'start_published_date': '2024-01-01',
    'num_results': 5
})

for repo in repos['results']:
    print(f"{repo['title']}: {repo['url']}")
```

### Custom Agent (JavaScript)

```javascript
const response = await fetch('https://api.claw0x.com/v1/call', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CLAW0X_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    skill: 'exa-search',
    input: {
      query: 'AI regulation news',
      category: 'news',
      start_published_date: '2024-03-15',
      end_published_date: '2024-03-22'
    }
  })
});

const data = await response.json();
console.log(data.results);
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `CLAW0X_API_KEY is required` | Missing API key | Set environment variable |
| `Invalid input` | Wrong input format | Check input schema |
| `search_type must be one of: neural, keyword, auto` | Invalid search type | Use valid enum value |
| `category must be one of: ...` | Invalid category | Use valid content type |
| `API error (500)` | Server error | Retry or contact support |

## Why Use Via Claw0x?

- **Unified billing**: One API key for all skills
- **Atomic pricing**: Pay per call, not per month
- **Zero cost on failure**: Failed calls don't charge
- **Production-ready**: 99.9% uptime, <100ms latency
- **Security scanned**: OSV.dev integration
- **No Exa API key needed**: Claw0x handles upstream authentication

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents — providing unified API access, atomic billing, and quality control.

**Explore more skills**: [claw0x.com/skills](https://claw0x.com/skills)

**GitHub**: [github.com/kennyzir/exa-search](https://github.com/kennyzir/exa-search)
