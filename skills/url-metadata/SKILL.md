---
name: "URL Metadata Fetcher"
slug: "url-metadata"
description: >
  Fetch Open Graph tags, title, description, favicon, and canonical URL from
  any webpage. Use when agents need to generate link previews, crawl content
  metadata, or extract SEO information from URLs.
category: "Utilities"
tags: ["url", "metadata", "opengraph", "seo", "link-preview"]
price_per_call: 0.002
input_schema:
  type: object
  properties:
    url:
      type: string
      description: "URL to fetch metadata from"
  required: ["url"]
output_schema:
  type: object
  properties:
    title:
      type: string
    description:
      type: string
    og_image:
      type: string
    favicon:
      type: string
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# URL Metadata Fetcher

Get Open Graph tags, title, description, favicon, Twitter Card data, and canonical URL from any webpage. Perfect for link preview generation and SEO analysis.

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Generate link preview | Send URL | Title + image + description |
| SEO audit | Send page URL | OG tags + canonical + language |
| Content crawling | Send article URL | Full metadata extraction |

## Example Usage

```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skill": "url-metadata", "input": {"url": "https://github.com"}}'
```

## Extracted Fields

title, description, og_title, og_description, og_image, og_type, og_site_name, twitter_card, twitter_title, twitter_description, twitter_image, favicon, canonical, language, author.

## Pricing

**$0.002 per successful call.** Failed calls are free.
