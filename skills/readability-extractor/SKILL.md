---
name: "Readability Extractor"
slug: "readability-extractor"
description: >
  Strip ads, navigation, and sidebars from any article URL or HTML. Use when
  agents need clean reading content for LLM context, article summarization,
  or RAG pipelines. Returns title, clean text, excerpt, and word count.
category: "Content"
tags: ["readability", "article", "content-extraction", "rag", "clean-text"]
price_per_call: 0
input_schema:
  type: object
  properties:
    url:
      type: string
      description: "URL to fetch and extract content from"
    html:
      type: string
      description: "Raw HTML to extract content from"
  required: []
output_schema:
  type: object
  properties:
    title:
      type: string
    content:
      type: string
    excerpt:
      type: string
    wordCount:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Readability Extractor

Extract clean, readable content from any webpage or HTML. Strips ads, navigation, sidebars, scripts, and noise. Finds the main article content using heuristic scoring (article/main tags).

## Use Cases

- LLM context preparation (clean text for prompts)
- Article summarization preprocessing
- RAG pipeline content extraction
- Content archiving (strip noise, keep substance)

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard

## Pricing

**FREE.** No charge per call.

- Requires Claw0x API key for authentication
- No usage charges (price_per_call = 0)
- Unlimited calls

## Example

**Input**:
```json
{ "url": "https://example.com/blog/article" }
```

**Output**:
```json
{
  "title": "Article Title",
  "content": "Clean article text without ads or navigation...",
  "excerpt": "Clean article text without ads...",
  "wordCount": 450,
  "source": "https://example.com/blog/article"
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Missing url/html, or URL fetch failed |
| 401 | Missing or invalid API key |
| 500 | Extraction failed (not billed) |

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/readability-extractor](https://github.com/kennyzir/readability-extractor)
