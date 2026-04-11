---
name: "Keyword Research"
slug: "keyword-research"
description: >
  Full-site keyword research with three-phase funnel. Use when you need to find
  SEO keyword opportunities for a website. Analyzes site topics, expands 30+ candidate
  keywords, runs SERP competition analysis on top 10, and recommends top 3 keywords
  with actionable landing page suggestions.
category: "SEO & Content"
tags: ["seo", "keyword-research", "serp-analysis", "competition-analysis", "content-strategy"]
price_per_call: 0.015
input_schema:
  type: object
  properties:
    domain:
      type: string
      description: "Website domain or URL to analyze"
    max_candidates:
      type: number
      description: "Max keywords in Phase 1 (default: 30, max: 50)"
    max_analyze:
      type: number
      description: "Max keywords for SERP analysis in Phase 2 (default: 10, max: 20)"
  required: ["domain"]
output_schema:
  type: object
  properties:
    site_analysis:
      type: object
      description: "Site type, core topics, target audience"
    phase1_candidates:
      type: array
      description: "30+ candidate keywords with source and layer"
    phase2_serp_analysis:
      type: array
      description: "SERP competition analysis for top 10 keywords"
    phase3_top_keywords:
      type: array
      description: "Top 3 recommended keywords with action plans"
    summary:
      type: object
      description: "Competition distribution summary"
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Keyword Research

Three-phase keyword research funnel: 30+ candidates → 10 SERP analyses → 3 actionable keywords.

> **$0.015 per successful call.** Failed calls are free.

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Starting SEO for a new site | Send domain | Full keyword research report |
| Need content ideas | Send domain + max_candidates: 50 | 50 keyword opportunities |
| Quick competition check | Send domain + max_analyze: 5 | Fast competition overview |

## 5-Minute Quickstart

### Step 1: Get API Key
Sign up at [claw0x.com](https://claw0x.com) → Dashboard → Create API Key

### Step 2: Analyze a Website
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer YOUR_CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "keyword-research",
    "input": { "domain": "example.com" }
  }'
```

### Step 3: Get Your Report
The response includes three phases:
- **Phase 1**: 30+ candidate keywords with source labels
- **Phase 2**: SERP competition analysis (score 5-25, low/medium/high)
- **Phase 3**: Top 3 keywords with landing page recommendations

## Three-Phase Funnel

```
Phase 1: Expand (30+ keywords)
  ├── Site topic analysis
  ├── Search result mining
  ├── AI-powered expansion (product, question, comparison, long-tail)
  └── Deduplication + relevance scoring

Phase 2: Analyze (10 keywords)
  ├── SERP competition scoring (5 dimensions)
  ├── High-authority site detection
  ├── Content depth assessment
  └── Competition level: 🟢 low / 🟡 medium / 🔴 high

Phase 3: Recommend (3 keywords)
  ├── Lowest competition first
  ├── Opportunity description
  ├── Recommended action plan
  └── Landing page blueprint (title, core points, CTA)
```

## Competition Scoring Model

| Dimension | 1 (Easy) | 3 (Medium) | 5 (Hard) |
|-----------|----------|------------|----------|
| Ads | 0 | 3-5 | 8+ |
| Authority sites | 0 | 2-3 | 5+ |
| Content depth | All thin | Mixed | All deep |
| Result count | Few | Moderate | Many |
| Domain diversity | Low | Medium | High |

- Total 5-10 → 🟢 Low competition (act now)
- Total 11-17 → 🟡 Medium competition (differentiate)
- Total 18-25 → 🔴 High competition (observe)

## Real-World Use Cases

### Scenario 1: New SaaS Launch
**Problem**: Just launched a SaaS product, need to find SEO opportunities.
**Solution**: Send your domain → get 30+ keyword ideas categorized by layer (core/mid-tail/long-tail/question).
**Result**: Actionable keyword strategy with competition data in seconds.

### Scenario 2: Content Calendar Planning
**Problem**: Need to plan next month's blog content.
**Solution**: Run keyword research → use Phase 3 recommendations as content topics.
**Result**: 3 data-backed content ideas with landing page blueprints.

### Scenario 3: Competitor Analysis
**Problem**: Want to know what keywords competitors are targeting.
**Solution**: Send competitor's domain → analyze their keyword landscape.
**Result**: Keyword gaps and opportunities to outrank them.

## Integration Recipes

### OpenClaw Agent
```typescript
const result = await claw0x.call('keyword-research', {
  domain: 'competitor.com',
  max_candidates: 40,
  max_analyze: 15,
});

const lowComp = result.data.phase3_top_keywords;
console.log(`Top opportunity: ${lowComp[0]?.keyword}`);
```

### LangChain Agent
```python
response = requests.post(
    "https://api.claw0x.com/v1/call",
    headers={"Authorization": f"Bearer {CLAW0X_API_KEY}"},
    json={"skill": "keyword-research", "input": {"domain": "example.com"}}
)
report = response.json()["data"]
for kw in report["phase3_top_keywords"]:
    print(f"{kw['keyword']} — {kw['competition_level']} — {kw['opportunity']}")
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Missing or invalid domain | Provide a valid domain (e.g. "example.com") |
| 401 | Missing or invalid API key | Check your CLAW0X_API_KEY |
| 500 | Internal error (not billed) | Retry or contact support |

## Pricing

**$0.015 per successful call.** Failed calls are free.

- Includes site analysis + keyword expansion + SERP analysis
- Pay only for successful responses (2xx status)
- No monthly fees, no subscriptions

## Why Use Via Claw0x?

- **Unified billing**: One API key for all skills
- **Atomic pricing**: Pay per call, not per month
- **Zero cost on failure**: Failed calls don't charge
- **Production-ready**: 99.9% uptime, low latency
- **Security scanned**: OSV.dev integration

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents — providing unified API access, atomic billing, and quality control.

**Explore more skills**: [claw0x.com/skills](https://claw0x.com/skills)
**GitHub**: [github.com/kennyzir/keyword-research](https://github.com/kennyzir/keyword-research)
