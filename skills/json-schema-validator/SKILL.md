---
name: "JSON Schema Validator"
slug: "json-schema-validator"
description: >
  Validate JSON data against a JSON Schema. Use when agents need to verify API
  responses, validate pipeline data, check CI quality gates, or ensure config
  files match expected structure. Returns detailed error paths.
category: "Developer Tools"
tags: ["json", "schema", "validation", "api-testing", "data-quality"]
price_per_call: 0
input_schema:
  type: object
  properties:
    data:
      type: any
      description: "JSON data to validate"
    schema:
      type: object
      description: "JSON Schema to validate against"
  required: ["data", "schema"]
output_schema:
  type: object
  properties:
    valid:
      type: boolean
    errors:
      type: array
    error_count:
      type: number
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# JSON Schema Validator

Validate any JSON data against a JSON Schema definition. Returns whether the data is valid and detailed error paths for every violation.

Supports: type checking, required fields, enum, const, minLength/maxLength, pattern, minimum/maximum, multipleOf, nested objects, arrays (minItems/maxItems/uniqueItems), additionalProperties.

## Use Cases

- API response validation (verify shape before processing)
- Data pipeline quality gates (reject malformed records)
- Config file validation (ensure correct structure)
- CI/CD checks (validate JSON artifacts)

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
  "data": {"name": "Alice", "age": "not-a-number"},
  "schema": {
    "type": "object",
    "required": ["name", "age"],
    "properties": {
      "name": {"type": "string"},
      "age": {"type": "number", "minimum": 0}
    }
  }
}
```

**Output**:
```json
{
  "valid": false,
  "errors": [{"path": "$.age", "message": "Expected type number, got string"}],
  "error_count": 1
}
```

## About Claw0x

[Claw0x](https://claw0x.com) is the native skills layer for AI agents.

**GitHub**: [github.com/kennyzir/json-schema-validator](https://github.com/kennyzir/json-schema-validator)
