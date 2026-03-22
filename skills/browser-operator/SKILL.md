---
name: Browser Operator
description: >
  Run structured browser workflows on modern websites. Use when a page requires
  JavaScript rendering, multi-step interaction, waits, screenshots, or rendered
  content extraction that plain HTTP scraping cannot handle.
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Browser Operator

Browser Operator is a browser execution layer for agents. It opens a live page, renders the UI, identifies actionable elements, performs bounded steps, and returns structured output.

## Why This Exists

Some websites are easy to scrape with a simple HTTP request. Others are not. They need JavaScript, button clicks, typed input, waits, or visual confirmation.

That is the gap this skill fills.

## Core Model

The core value is not simply launching a browser. The core value is turning a messy live page into a controlled action loop:

1. Render the page
2. Discover visible elements
3. Execute a small set of actions
4. Wait for UI state to settle
5. Return structured results

## Use Cases

- Fill and submit forms
- Log into internal dashboards
- Check whether a workflow completed
- Extract text after client-side rendering
- Capture screenshots after a sequence of actions
- Navigate portals where links and buttons appear only after page hydration

## Inputs

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Starting URL |
| `steps` | array | Ordered browser steps |
| `viewport` | object | Optional browser viewport |
| `user_agent` | string | Optional user agent override |
| `return_snapshot` | boolean | Return a final actionable element map |
| `capture_screenshot` | boolean | Return a final screenshot |
| `timeout_ms` | number | Global timeout hint |

## Step Types

- `snapshot`
- `click`
- `fill`
- `type`
- `select`
- `press`
- `wait`
- `extract`
- `scroll`
- `screenshot`

## Example

```json
{
  "input": {
    "url": "https://example.com/login",
    "steps": [
      { "type": "snapshot" },
      { "type": "fill", "selector": "input[name=email]", "value": "ops@example.com" },
      { "type": "fill", "selector": "input[name=password]", "value": "demo-password" },
      { "type": "click", "selector": "button[type=submit]" },
      { "type": "wait", "until": "url", "value": "/dashboard" },
      { "type": "extract", "mode": "text", "selector": "main" }
    ]
  }
}
```

## Output Shape

- Final URL
- Final title
- Per-step results
- Optional final snapshot
- Optional screenshot
- Metadata such as latency and step count

## Guidance

- Keep workflows bounded
- Re-snapshot after major UI changes
- Prefer explicit selectors or fresh refs
- Use waits when navigation or async loading is expected
- Avoid sensitive sites unless you trust the workflow and storage path

## Pricing

Free during validation.
