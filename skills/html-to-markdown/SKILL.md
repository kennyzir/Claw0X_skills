---
name: "HTML to Markdown"
slug: "html-to-markdown"
description: >
  Convert HTML pages to clean Markdown for LLM consumption. Use when building
  RAG pipelines, preparing web content for AI context windows, or extracting
  readable content from HTML. Strips scripts, styles, nav, ads. Preserves
  headings, links, lists, code blocks, and tables.
category: "Utility"
tags: ["html", "markdown", "conversion", "rag", "llm", "content-extraction"]
price_per_call: 0.002
input_schema:
  type: object
  properties:
    html:
      type: string
      description: "Raw HTML content to convert (max 5MB). Mutually exclusive with url."
    url:
      type: string
      description: "URL to fetch and convert. Mutually exclusive with html."
  required: []
output_schema:
  type: object
  properties:
    markdown:
      type: string
      description: "Clean Markdown output"
    char_count:
      type: number
    line_count:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# HTML to Markdown

Convert any HTML content or URL into clean, LLM-ready Markdown. Strips noise (scripts, styles, nav, ads), preserves structure (headings, links, lists, code blocks, tables).

## How It Works

1. Accept raw HTML string or fetch from URL (10s timeout, follows redirects)
2. Strip non-content elements: `<script>`, `<style>`, `<nav>`, `<footer>`, `<aside>`
3. Convert semantic HTML to Markdown: headings, bold, italic, links, images, code, lists, tables, blockquotes
4. Decode HTML entities, normalize whitespace
5. Return clean Markdown with metadata

## Use Cases

- RAG pipeline preprocessing (web → Markdown → embeddings)
- LLM context window preparation
- Content extraction from web pages
- Documentation conversion
- Web scraping post-processing

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Pricing

**$0.002 per successful call.** Failed calls are free.

## Example

**Input**:
```json
{
  "url": "https://example.com/article"
}
```

**Output**:
```json
{
  "markdown": "# Article Title\n\nFirst paragraph...\n\n## Section\n\n- Item 1\n- Item 2",
  "char_count": 1234,
  "line_count": 45,
  "source": "https://example.com/article"
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Missing html/url, or URL fetch failed |
| 401 | Missing or invalid API key |
| 500 | Conversion failed (not billed) |

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/html-to-markdown](https://github.com/kennyzir/html-to-markdown)
