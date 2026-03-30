---
name: "Entity Extractor"
slug: "entity-extractor"
description: >
  Extract named entities from text: people, organizations, locations, dates,
  emails, URLs, phone numbers, and monetary values. Use when agents need to
  parse unstructured text into structured data for CRM enrichment, news
  analysis, or document processing.
category: "NLP"
tags: ["ner", "entity-extraction", "nlp", "text-analysis"]
price_per_call: 0.008
input_schema:
  type: object
  properties:
    text:
      type: string
      description: "Text to extract entities from (max 50,000 chars)"
  required: ["text"]
output_schema:
  type: object
  properties:
    entities:
      type: array
      description: "Array of extracted entities with type, position"
    grouped:
      type: object
      description: "Entities grouped by type"
    total_count:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Entity Extractor

Extract people, organizations, locations, dates, emails, URLs, phone numbers, and monetary values from any text. Server-side NER using pattern matching and heuristics.

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Parse news article | Send article text | People, orgs, locations |
| Enrich CRM data | Send email/message | Emails, phones, names |
| Process invoices | Send invoice text | Dates, money, companies |

## Example Usage

```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "entity-extractor",
    "input": {
      "text": "John Smith from Acme Corp signed a $50,000 deal on March 15, 2026. Contact: john@acme.com"
    }
  }'
```

## Entity Types

| Type | Examples |
|------|---------|
| PERSON | John Smith, Jane Doe |
| ORGANIZATION | Acme Corp, Google Inc |
| LOCATION | New York City, Silicon Valley |
| DATE | March 15, 2026, 2026-03-15 |
| MONEY | $50,000, €1,200 |
| EMAIL | john@acme.com |
| URL | https://example.com |
| PHONE | +1-555-123-4567 |

## Pricing

**$0.008 per successful call.** Failed calls are free.
