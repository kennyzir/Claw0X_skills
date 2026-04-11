---
name: "YouTube Intel"
slug: "youtube-intel"
description: >
  YouTube content intelligence and competitor monitoring. Use when you need to analyze
  a YouTube category, discover content opportunities, or monitor competitor channels.
  Discovery mode scans sub-categories for competition and gaps. Monitoring mode tracks
  specific channels or topics.
category: "Content & Social"
tags: ["youtube", "content-intelligence", "competitor-analysis", "content-strategy", "video-marketing"]
price_per_call: 0.012
input_schema:
  type: object
  properties:
    category:
      type: string
      description: "Category or topic to analyze (e.g. 'AI tools', 'gaming')"
    mode:
      type: string
      description: "'discovery' (default) or 'monitoring'"
    max_sub_categories:
      type: number
      description: "Max sub-categories to analyze in discovery mode (default: 5, max: 8)"
  required: ["category"]
output_schema:
  type: object
  properties:
    analyses:
      type: array
      description: "Per-subcategory analysis with videos, channels, competition, opportunities"
    top_opportunities:
      type: array
      description: "Ranked content opportunities across all sub-categories"
    summary:
      type: object
      description: "Aggregate stats and competition distribution"
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# YouTube Intel

Scan YouTube categories for content opportunities. Discovery + Monitoring modes.

> **$0.012 per successful call.** Failed calls are free.

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| "Is there opportunity in X niche?" | Discovery mode | Competition map + content gaps |
| "What are competitors posting?" | Monitoring mode | Recent videos + content types |
| Planning YouTube content | Discovery + category | Ranked opportunities with angles |

## Two Modes

### Discovery Mode (default)
Expands a category into sub-categories, searches YouTube for each, analyzes competition, and identifies content gaps.

```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "youtube-intel",
    "input": { "category": "AI tools", "mode": "discovery" }
  }'
```

### Monitoring Mode
Searches for a specific topic or channel and returns recent videos with content type classification.

```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "youtube-intel",
    "input": { "category": "Fireship channel", "mode": "monitoring" }
  }'
```

## Discovery Workflow

```
Category Input (e.g. "AI tools")
    ↓
1. Expand into sub-categories
   → AI image tools, AI coding tools, AI writing tools...
    ↓
2. Search YouTube for each sub-category
    ↓
3. Classify content types (review/tutorial/list/comparison/news)
    ↓
4. Aggregate by channel (established vs emerging)
    ↓
5. Assess competition (🟢 low / 🟡 medium / 🔴 high / ⚪ blank)
    ↓
6. Identify opportunities (format gaps, blank markets, tutorial gaps)
    ↓
Ranked Opportunity Report
```

## Competition Levels

| Level | Emoji | Meaning | Action |
|-------|-------|---------|--------|
| Blank | ⚪ | Very few videos | First mover advantage |
| Low | 🟢 | Few established channels | Enter now, publish consistently |
| Medium | 🟡 | Some competition | Differentiate with unique angle |
| High | 🔴 | Many established channels | Find a niche or sub-niche |

## Integration Recipes

### OpenClaw Agent
```typescript
const result = await claw0x.call('youtube-intel', {
  category: 'AI productivity tools',
  mode: 'discovery',
  max_sub_categories: 6,
});

for (const opp of result.data.top_opportunities) {
  console.log(`${opp.competition} ${opp.sub_category}: ${opp.suggested_angle}`);
}
```

### Content Calendar Builder
```javascript
const intel = await claw0x.call('youtube-intel', { category: 'web development' });
const lowComp = intel.data.analyses.filter(a => a.competition.level !== 'high');
// Use low-competition sub-categories as content topics
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Missing category or invalid mode | Provide category, mode: discovery/monitoring |
| 401 | Missing or invalid API key | Check your CLAW0X_API_KEY |
| 500 | Internal error (not billed) | Retry or contact support |

## Pricing

**$0.012 per successful call.** Failed calls are free.

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**Explore more skills**: [claw0x.com/skills](https://claw0x.com/skills)
**GitHub**: [github.com/kennyzir/youtube-intel](https://github.com/kennyzir/youtube-intel)
