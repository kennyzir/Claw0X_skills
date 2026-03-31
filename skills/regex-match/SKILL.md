---
name: "Regex Match & Extract"
slug: "regex-match"
description: >
  Apply regex patterns to text and return all matches with capture groups and
  positions. Use when agents need log parsing, data cleaning, pattern detection,
  or text extraction. Supports flags, named groups, and multiple patterns.
category: "Developer Tools"
tags: ["regex", "pattern", "extraction", "parsing", "text-processing"]
price_per_call: 0
input_schema:
  type: object
  properties:
    text:
      type: string
      description: "Text to search (max 500KB)"
    pattern:
      type: string
      description: "Regex pattern to apply"
    patterns:
      type: array
      description: "Multiple patterns to apply (max 20)"
    flags:
      type: string
      description: "Regex flags (default: 'g'). Options: g, i, m, s"
  required: ["text"]
output_schema:
  type: object
  properties:
    matches:
      type: array
    total_matches:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Regex Match & Extract

Apply regex patterns to text and get all matches with capture groups, named groups, and positions. Supports single pattern or batch mode (up to 20 patterns).

## Use Cases

- Log parsing (extract timestamps, IPs, error codes)
- Data cleaning (find and extract structured data)
- Pattern detection (find emails, URLs, phone numbers)
- Text extraction (pull specific fields from unstructured text)

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
{
  "text": "Error at 2024-03-15 14:30:22 from 192.168.1.1: Connection timeout",
  "pattern": "(\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2})"
}
```

**Output**:
```json
{
  "matches": [{"match": "2024-03-15 14:30:22", "index": 9, "groups": null, "captures": ["2024-03-15", "14:30:22"]}],
  "total_matches": 1
}
```

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/regex-match](https://github.com/kennyzir/regex-match)
