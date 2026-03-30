---
name: "Keyword Extractor"
slug: "keyword-extractor"
description: >
  Extract top keywords and keyphrases from text using TF-IDF scoring. Use when
  agents need to tag content, optimize SEO, build search indexes, or summarize
  topics. Returns ranked single words and multi-word phrases with frequency counts.
category: "NLP"
tags: ["keywords", "nlp", "seo", "tf-idf", "content-tagging", "text-analysis"]
price_per_call: 0.005
input_schema:
  type: object
  properties:
    text:
      type: string
      description: "Text to extract keywords from (20-100,000 chars)"
    max_keywords:
      type: number
      description: "Max keywords to return (default 20, max 50)"
  required: ["text"]
output_schema:
  type: object
  properties:
    keywords:
      type: array
      description: "Ranked keywords with term, score, count, type"
    top_words:
      type: array
      description: "Top 10 single-word keywords"
    top_phrases:
      type: array
      description: "Top 5 multi-word keyphrases"
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Keyword Extractor

Extract the most important keywords and keyphrases from any text. Uses TF-IDF scoring with stop word removal and bigram detection. No external API needed.

## How It Works

1. Tokenize text, filter stop words and short tokens
2. Calculate term frequency (TF) for each word
3. Detect significant bigrams (2-word phrases appearing 2+ times)
4. Score phrases with 1.5x bonus over single words
5. Return ranked list with scores and counts

## Use Cases

- SEO optimization (find target keywords)
- Content tagging (auto-label articles)
- Search index building (extract index terms)
- Topic summarization (what is this text about?)
- Competitive analysis (keyword gap detection)

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Pricing

**$0.005 per successful call.** Failed calls are free.

## Example

**Input**:
```json
{
  "text": "Machine learning models require large datasets for training. Deep learning neural networks have revolutionized machine learning by enabling automatic feature extraction from raw data.",
  "max_keywords": 10
}
```

**Output**:
```json
{
  "keywords": [
    {"term": "machine learning", "score": 8.5, "count": 2, "type": "phrase"},
    {"term": "learning", "score": 5.2, "count": 3, "type": "word"},
    {"term": "deep", "score": 3.1, "count": 1, "type": "word"}
  ],
  "top_words": ["learning", "deep", "training", "data", "neural"],
  "top_phrases": ["machine learning", "deep learning", "neural networks"]
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Text too short (<20 chars) or too long (>100K) |
| 401 | Missing or invalid API key |
| 500 | Extraction failed (not billed) |

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/keyword-extractor](https://github.com/kennyzir/keyword-extractor)
