---
name: Self-Improving Agent
description: >
  Capture learnings, errors, corrections, and patterns for continuous agent
  improvement via the Claw0x API. Use when a command fails unexpectedly, a user
  corrects agent output, a new pattern is discovered, or the agent needs to log
  and process improvement events. Returns structured insights, suggested rules,
  and batch summaries. Supports single events and batch processing.
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
---

# Self-Improving Agent

Turn your agent's mistakes into systematic improvements. Every error, correction, and learning becomes a structured insight with auto-generated rules.

> **Free to use.** This skill costs nothing. Just [sign up at claw0x.com](https://claw0x.com), create an API key, and start calling. No credit card, no wallet top-up required.

## Quick Reference

| When This Happens | Log As | What You Get |
|-------------------|--------|--------------|
| API call fails | `error` | Retry rule with timeout adjustment |
| User corrects output | `correction` | Format/style rule based on delta |
| Discover new pattern | `learning` | Best practice for similar tasks |
| Same issue repeats | Batch log | Systemic fix recommendations |
| Command times out | `error` | Timeout + retry strategy |
| Wrong assumption | `learning` | Updated knowledge rule |

**Why API-based?** Works in any environment (cloud, serverless, containers), scales to multi-agent fleets, provides centralized analytics. No file system dependencies.

---

## 5-Minute Quickstart

### Step 1: Get API Key (30 seconds)
Sign up at [claw0x.com](https://claw0x.com) → Dashboard → Create API Key

### Step 2: Log Your First Error (1 minute)
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer ck_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "self-improving-agent",
    "input": {
      "type": "error",
      "context": "payment-api.ts",
      "detail": "ETIMEDOUT after 30s"
    }
  }'
```

### Step 3: Get Actionable Insight (instant)
```json
{
  "entries": [{
    "severity": "high",
    "tags": ["network", "timeout", "payment"],
    "actionable_insight": "Payment API call timed out — reduce timeout and add retry",
    "suggested_rule": "Set 10s timeout for payment API. Retry once on ETIMEDOUT with 2s backoff."
  }]
}
```

### Step 4: Apply the Rule (2 minutes)
```typescript
// Add to your agent config
agent.addRule("Set 10s timeout for payment API. Retry once on ETIMEDOUT.");
```

**Done.** Your agent just learned from its mistake.

## How It Works �?Under the Hood

This skill provides a structured event processing pipeline for agent self-improvement. It doesn't store data persistently �?instead, it processes each event (or batch of events) in real time and returns actionable insights.

### The Processing Pipeline

1. **Event classification** �?each incoming event is classified by type (`error`, `correction`, `learning`, `pattern`). If no severity is provided, it's auto-inferred based on the event type and content keywords.

2. **Auto-tagging** �?the skill scans the `context` and `detail` fields for known patterns and applies tags automatically. For example:
   - An error mentioning "timeout" or "ETIMEDOUT" gets tagged `[network]`, `[timeout]`
   - A correction in a `.ts` file gets tagged `[typescript]`
   - A learning about "retry" gets tagged `[resilience]`

3. **Insight generation** �?for each event, the skill generates an `actionable_insight` �?a one-sentence summary of what the agent should do differently. For corrections, this compares the `previous_attempt` with the `corrected_output` to identify the delta.

4. **Rule suggestion** �?each event produces a `suggested_rule` �?a concrete, implementable rule the agent could add to its system prompt or configuration. Example: `"When calling external APIs, set a 10s timeout and retry once on ETIMEDOUT."`

5. **Batch analysis** (for multi-event submissions) �?when you send an `events` array, the skill also produces:
   - Breakdown by type and severity
   - Top recurring tags (indicating systemic issues)
   - Pattern detection across events (e.g., "3 of 5 errors are network-related")
   - Prioritized recommendations

### Why This Matters for Agents

Traditional software logs errors and a human reads them later. Autonomous agents need to process their own failures in real time and adapt. This skill provides the structured feedback loop:

```
Agent runs �?Error occurs �?Log to self-improving-agent �?Get insight + rule �?Agent updates behavior
```

The skill is stateless by design �?it doesn't accumulate history across calls. If you need persistent memory, store the returned `entries` in your own database and feed historical context back in future calls.

### Event Types Explained

| Type | When to Use | Example |
|------|-------------|---------|
| `error` | Something failed unexpectedly | API returned 500, file not found, parse error |
| `correction` | User or supervisor fixed agent output | Agent used tabs, user said use spaces |
| `learning` | Agent discovered something new | "This API requires auth header in a specific format" |
| `pattern` | Recurring behavior worth codifying | "Users always ask for JSON output, not XML" |

## Prerequisites

This is a free skill. Just get an API key:

1. Sign up at [claw0x.com](https://claw0x.com)
2. Go to Dashboard �?API Keys �?Create Key
3. Set it as an environment variable:

```bash
export CLAW0X_API_KEY="your-api-key-here"
```

No credit card or wallet balance needed.

## When to Use

- An operation fails and the agent wants to record what went wrong
- User corrects agent output and the agent should learn from it
- Agent discovers a new pattern worth remembering
- Agent pipeline needs to process a batch of improvement events

---

## Real-World Use Cases

### Scenario 1: API Integration Debugging
**Problem**: Your agent keeps failing when calling external APIs

**Solution**:
1. Log each API error to self-improving-agent
2. Get auto-tagged insights (network, timeout, auth, etc.)
3. Apply suggested rules (retry logic, timeout adjustments)
4. Reduce API failure rate by 60%

**Example**:
```typescript
try {
  await paymentAPI.charge(amount);
} catch (error) {
  const insight = await claw0x.call('self-improving-agent', {
    type: 'error',
    context: 'payment-api.ts',
    detail: error.message
  });
  // Apply: "Set 10s timeout. Retry once on ETIMEDOUT."
  await agent.updateConfig(insight.entries[0].suggested_rule);
}
```

### Scenario 2: User Correction Learning
**Problem**: Users frequently correct your agent's output format

**Solution**:
1. Log each correction with previous_attempt and corrected_output
2. Get suggested rules for output formatting
3. Update agent prompt with accumulated rules
4. Reduce correction rate from 30% to 5%

**Example**:
```python
def on_user_correction(previous, corrected, context):
    result = client.call("self-improving-agent", {
        "type": "correction",
        "context": context,
        "previous_attempt": previous,
        "corrected_output": corrected
    })
    # Apply rule to agent memory
    agent.memory.add_rule(result["entries"][0]["suggested_rule"])
```

### Scenario 3: Pattern Detection
**Problem**: Your agent makes the same mistakes repeatedly

**Solution**:
1. Batch-log 50 recent errors
2. Get summary with top_tags and patterns_detected
3. Identify systemic issues (e.g., "80% are auth-related")
4. Fix root cause instead of symptoms

**Example**:
```javascript
const events = recentErrors.map(e => ({
  type: 'error',
  context: e.context,
  detail: e.message
}));

const result = await claw0x.call('self-improving-agent', { events });
// result.summary.patterns_detected: ["auth-service.ts appeared 40 times"]
// Fix auth-service.ts once, eliminate 40 errors
```

### Scenario 4: Multi-Agent Fleet Management
**Problem**: Managing learnings across 10+ agent instances

**Solution**:
1. Each agent logs to self-improving-agent API
2. Store results in central database
3. Aggregate insights across fleet
4. Distribute top rules to all agents
5. Continuous improvement at scale

---

## Integration Recipes

### OpenClaw Agent
```typescript
import { Claw0xClient } from '@claw0x/sdk';

const claw0x = new Claw0xClient(process.env.CLAW0X_API_KEY);

// In your agent's error handler
agent.onError(async (error, context) => {
  const result = await claw0x.call('self-improving-agent', {
    type: 'error',
    context: context.file,
    detail: error.message
  });
  
  // Apply suggested rule
  if (result.entries[0].suggested_rule) {
    await agent.addRule(result.entries[0].suggested_rule);
    console.log('✓ Rule applied:', result.entries[0].suggested_rule);
  }
});
```

### LangChain Agent
```python
from claw0x import Claw0xClient
import os

client = Claw0xClient(api_key=os.getenv("CLAW0X_API_KEY"))

def on_user_correction(previous, corrected, context):
    result = client.call("self-improving-agent", {
        "type": "correction",
        "context": context,
        "detail": "User corrected output",
        "previous_attempt": previous,
        "corrected_output": corrected
    })
    
    # Store in agent memory
    agent.memory.add_rule(result["entries"][0]["suggested_rule"])
    return result["entries"][0]["actionable_insight"]
```

### Custom Agent (Generic HTTP)
```javascript
async function logLearning(type, context, detail) {
  const response = await fetch('https://api.claw0x.com/v1/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLAW0X_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      skill: 'self-improving-agent',
      input: { type, context, detail }
    })
  });
  
  const result = await response.json();
  return result.entries[0];
}

// Use in your agent
try {
  await riskyOperation();
} catch (error) {
  const insight = await logLearning('error', 'riskyOperation', error.message);
  console.log('Insight:', insight.actionable_insight);
  console.log('Rule:', insight.suggested_rule);
  
  // Store for later review
  await db.learnings.create(insight);
}
```

### Batch Processing
```typescript
// Collect events throughout the day
const events = [];

agent.onError((error, ctx) => {
  events.push({ type: 'error', context: ctx.file, detail: error.message });
});

agent.onCorrection((prev, corrected, ctx) => {
  events.push({ 
    type: 'correction', 
    context: ctx.file, 
    detail: 'User corrected output',
    previous_attempt: prev,
    corrected_output: corrected
  });
});

// Process batch at end of day
async function dailyReview() {
  const result = await claw0x.call('self-improving-agent', { events });
  
  console.log('Summary:', result.summary);
  // {
  //   by_severity: { high: 12, medium: 8, low: 5 },
  //   top_tags: [{ tag: 'network', count: 15 }, { tag: 'auth', count: 10 }],
  //   patterns_detected: ["payment-api.ts appeared 8 times"],
  //   recommendations: ["Multiple high-severity events — consider systematic review"]
  // }
  
  // Apply top rules
  for (const entry of result.entries.filter(e => e.severity === 'critical')) {
    await agent.addRule(entry.suggested_rule);
  }
}
```

## Input (Single Event)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input.type` | string | yes | `"error"`, `"correction"`, `"learning"`, or `"pattern"` |
| `input.context` | string | yes | Where it happened (file, module, function) |
| `input.detail` | string | yes | What happened |
| `input.severity` | string | no | `"low"`, `"medium"`, `"high"`, `"critical"` (auto-inferred if omitted) |
| `input.tags` | string[] | no | Manual tags (auto-tags are also added) |
| `input.previous_attempt` | string | no | What the agent originally produced (for corrections) |
| `input.corrected_output` | string | no | What the correct output should be (for corrections) |

## Input (Batch)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input.events` | array | yes | Array of event objects (same fields as single event) |

## Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `entries` | array | Processed events with id, severity, tags, actionable_insight, suggested_rule |
| `summary` | object | Batch summary (null for single events): by_type, by_severity, top_tags, patterns_detected, recommendations |

## Example

**Single error input:**
```json
{
  "type": "error",
  "context": "api-client.ts",
  "detail": "ETIMEDOUT after 30s calling payment API"
}
```

**Output:**
```json
{
  "entries": [{
    "id": "evt_abc123",
    "type": "error",
    "severity": "high",
    "tags": ["network", "timeout", "payment"],
    "actionable_insight": "Payment API call timed out �?consider reducing timeout and adding retry with exponential backoff.",
    "suggested_rule": "Set a 10s timeout for payment API calls. Retry once on ETIMEDOUT with 2s backoff."
  }]
}
```

## Error Codes

- `400` — Missing required fields (type, context, detail)
- `401` — Invalid or missing API key
- `500` — Processing failed (not billed)

## Pricing

**Free.** Apply for an API key and use it at no cost. No credit card required.

---

## API vs File-Based: Which is Right for You?

| Feature | File-Based (e.g., ClawHub) | Claw0x (API-Based) |
|---------|----------------------------|---------------------|
| **Setup Time** | 10-15 min (create files, configure hooks) | 2 min (get API key, make call) |
| **Platform Support** | Requires file system access | Works anywhere (cloud, serverless, containers) |
| **Persistence** | Built-in (Markdown files) | You control (DB, file, memory) |
| **Multi-Agent** | Requires shared file system | Centralized via API |
| **Offline** | ✅ Works offline | ❌ Requires internet |
| **Automation** | Requires hook configuration | Built-in (API call = logged) |
| **Scalability** | Limited by file I/O | Scales to millions of events |
| **Analytics** | Manual (grep, parse Markdown) | Automatic (structured JSON) |
| **Cost** | Free (local) | Free (API) |

### When to Use File-Based
- Single-agent, local development
- Need offline capability
- Prefer Markdown for human readability
- Want Git-tracked learning history

### When to Use Claw0x (API-Based)
- Multi-agent fleet management
- Cloud/serverless environments (Lambda, Cloud Run, etc.)
- Need centralized analytics across agents
- Want structured JSON for downstream processing
- Running in containers or restricted file systems
- Building agent-as-a-service products

### Best of Both Worlds
Use Claw0x API for processing, store results locally:
```typescript
const result = await claw0x.call('self-improving-agent', event);

// Store as Markdown (human-readable)
fs.appendFileSync('.learnings/ERRORS.md', `
## ${result.entries[0].id}
**Severity**: ${result.entries[0].severity}
**Tags**: ${result.entries[0].tags.join(', ')}

${result.entries[0].actionable_insight}

**Suggested Rule**: ${result.entries[0].suggested_rule}
`);

// AND store as JSON (machine-readable)
await db.learnings.create(result.entries[0]);
```

---

## How It Fits Into Your Agent Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     Your AI Agent                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─ Task Execution
                            │
                ┌───────────┴───────────┐
                │                       │
            ✅ Success              ❌ Error/Correction
                │                       │
                │                       ├─ Log to Claw0x
                │                       │  POST /v1/call
                │                       │  {type, context, detail}
                │                       │
                │                       ├─ Get Insights
                │                       │  {severity, tags, 
                │                       │   actionable_insight,
                │                       │   suggested_rule}
                │                       │
                │                       └─ Apply Rule
                │                          agent.addRule(...)
                │
                └─ Continue
```

### Integration Points

1. **Error Handler** — Catch exceptions, log to API
2. **User Feedback Loop** — Capture corrections, extract delta
3. **Batch Review** — End of day, process all events
4. **Rule Application** — Update agent config with suggested rules
5. **Analytics Dashboard** — Visualize learning trends over time

---

## Why Use This Via Claw0x?

### Unified Infrastructure
- **One API key** for all skills — no per-provider auth
- **Atomic billing** — pay per successful call, $0 on failure
- **Security scanned** — OSV.dev integration for all skills

### Agent-Optimized
- **Structured output** — JSON format, easy to parse and store
- **Auto-generated rules** — ready to apply to agent config
- **Batch processing** — analyze multiple events in one call
- **Cross-agent analytics** — aggregate insights across your fleet

### Production-Ready
- **99.9% uptime** — reliable infrastructure
- **35ms avg response** — fast enough for real-time logging
- **Scales to millions** — no file I/O bottlenecks
- **Cloud-native** — works in Lambda, Cloud Run, containers