---
name: "Keyword Competition Analyzer"
slug: "keyword-competition"
description: >
  Analyze SERP competition for any keyword. Use when you need to check if a keyword
  is worth targeting. Scores competition across 5 dimensions, identifies authority sites,
  assesses content depth, and provides go/differentiate/avoid recommendation.
category: "SEO & Content"
tags: ["seo", "keyword-competition", "serp-analysis", "content-strategy"]
price_per_call: 0.008
input_schema:
  type: object
  properties:
    keyword:
      type: string
      description: "Keyword to analyze competition for"
  required: ["keyword"]
output_schema:
  type: object
  properties:
    scores:
      type: object
      description: "5-dimension competition scores (1-5 each)"
    total_score:
      type: number
      description: "Total competition score (5-25)"
    competition_level:
      type: string
      description: "low / medium / high"
    top_results:
      type: array
      description: "Top 10 SERP results with authority flags"
    recommendation:
      type: object
      description: "Action plan: go / differentiate / avoid"
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Keyword Competition Analyzer

Check if a keyword is worth targeting in 2 seconds. 5-dimension SERP scoring with actionable recommendations.

> **$0.008 per successful call.** Failed calls are free.

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Found a keyword idea | Send keyword | Competition score + recommendation |
| Deciding between keywords | Compare scores | Data-driven priority ranking |
| Content planning | Check competition first | Go / differentiate / avoid signal |

## 5-Minute Quickstart

### Step 1: Get API Key
Sign up at [claw0x.com](https://claw0x.com) → Dashboard → Create API Key

### Step 2: Check Competition
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer YOUR_CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "keyword-competition",
    "input": { "keyword": "best AI writing tools 2026" }
  }'
```

### Step 3: Get Your Score
```json
{
  "competition_level": "medium",
  "competition_emoji": "🟡",
  "total_score": 14,
  "recommendation": {
    "action": "differentiate",
    "strategy": "Medium competition — you need a unique angle...",
    "suggested_word_count": 2500,
    "content_angle": "Find a gap in existing content..."
  }
}
```

## Scoring Model

| Dimension | 1 (Easy) | 3 (Medium) | 5 (Hard) |
|-----------|----------|------------|----------|
| Ad presence | None | Some | Heavy |
| Authority sites | 0 | 2-3 | 5+ |
| Content depth | Thin pages | Mixed | Deep content |
| Result saturation | Few results | Moderate | Saturated |
| Domain diversity | Few domains | Mixed | Many unique |

- 5-10 → 🟢 Low → **Go** (create content now)
- 11-17 → 🟡 Medium → **Differentiate** (unique angle needed)
- 18-25 → 🔴 High → **Avoid** (try long-tail variations)

## Integration Recipes

### OpenClaw Agent
```typescript
const result = await claw0x.call('keyword-competition', {
  keyword: 'AI code review tools',
});
if (result.data.recommendation.action === 'go') {
  console.log('Low competition — create content now!');
}
```

### Batch Comparison
```javascript
const keywords = ['AI writing tools', 'AI code review', 'AI image generator'];
const results = await Promise.all(
  keywords.map(kw => claw0x.call('keyword-competition', { keyword: kw }))
);
const ranked = results
  .map(r => r.data)
  .sort((a, b) => a.total_score - b.total_score);
console.log(`Easiest: ${ranked[0].keyword} (${ranked[0].competition_emoji})`);
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Missing or invalid keyword | Provide keyword (2-200 chars) |
| 401 | Missing or invalid API key | Check your CLAW0X_API_KEY |
| 500 | Internal error (not billed) | Retry or contact support |

## Pricing

**$0.008 per successful call.** Failed calls are free.

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**Explore more skills**: [claw0x.com/skills](https://claw0x.com/skills)
**GitHub**: [github.com/kennyzir/keyword-competition](https://github.com/kennyzir/keyword-competition)
