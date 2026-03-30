---
name: "Text Classifier"
slug: "text-classifier"
description: >
  Classify text into predefined or custom categories. Use when agents need to
  route tickets, moderate content, categorize emails, or tag documents.
  Uses keyword matching and TF-IDF scoring. No external API needed.
category: "NLP"
tags: ["classification", "nlp", "text-analysis", "categorization", "content-moderation"]
price_per_call: 0.01
input_schema:
  type: object
  properties:
    text:
      type: string
      description: "Text to classify (10-50,000 chars)"
    categories:
      type: object
      description: "Optional custom categories map {category: [keywords]}. Uses predefined if omitted."
  required: ["text"]
output_schema:
  type: object
  properties:
    category:
      type: string
      description: "Top predicted category"
    confidence:
      type: number
      description: "Confidence score 0-100"
    top_categories:
      type: array
      description: "Top 3 categories with scores"
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Text Classifier

Classify text into categories using keyword matching and TF-IDF scoring. Supports 8 predefined categories (technology, business, science, health, sports, politics, entertainment, education) or custom categories you define.

## How It Works

1. Tokenize input text, remove stop words
2. Match against category keyword lists
3. Score using term frequency relative to text length
4. Return top category with confidence and ranked alternatives

## Use Cases

- Content moderation (flag inappropriate content)
- Ticket routing (assign support tickets to teams)
- Email categorization (inbox triage)
- Document tagging (auto-label content)
- News classification (topic detection)

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Pricing

**$0.01 per successful call.** Failed calls are free.

## Example

**Input**:
```json
{
  "text": "The new GPU from NVIDIA delivers 2x performance for machine learning workloads, making it ideal for training large language models."
}
```

**Output**:
```json
{
  "category": "technology",
  "confidence": 85,
  "top_categories": [
    {"category": "technology", "score": 12.5},
    {"category": "business", "score": 2.1},
    {"category": "science", "score": 1.8}
  ]
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Text too short (<10 chars) or too long (>50K) |
| 401 | Missing or invalid API key |
| 500 | Classification failed (not billed) |

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/text-classifier](https://github.com/kennyzir/text-classifier)
