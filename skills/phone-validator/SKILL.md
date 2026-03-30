---
name: "Phone Validator"
slug: "phone-validator"
description: >
  Validate, normalize, and classify phone numbers globally. Use when agents
  need to verify phone format, detect country of origin, identify carrier type,
  or score phone number risk for lead qualification and fraud prevention.
category: "Validation"
tags: ["phone", "validation", "normalize", "carrier", "fraud"]
price_per_call: 0.005
input_schema:
  type: object
  properties:
    phone:
      type: string
      description: "Phone number to validate (any format)"
  required: ["phone"]
output_schema:
  type: object
  properties:
    valid:
      type: boolean
    normalized:
      type: string
    country:
      type: string
    type:
      type: string
    risk_score:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Phone Validator

Validate, normalize, and classify phone numbers from any country. Returns country detection, carrier type classification, and risk scoring.

## Prerequisites

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**: `export CLAW0X_API_KEY="ck_live_..."`

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| Form submission | Validate phone | Valid/invalid + normalized |
| Lead qualification | Check phone | Country + carrier type |
| Fraud prevention | Score phone | Risk score 0-100 |

## Example Usage

```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skill": "phone-validator", "input": {"phone": "+1 (555) 123-4567"}}'
```

## Supported Countries

US/Canada, UK, China, Japan, Germany, France, Australia, India, Brazil, South Korea, Italy, Spain, Russia, Mexico, Singapore, Hong Kong, Taiwan, UAE, and more.

## Pricing

**$0.005 per successful call.** Failed calls are free.
