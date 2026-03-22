---
name: Skill Creator
description: >
  Create new AI agent skills from scratch, improve existing skills, and optimize
  skill descriptions for better triggering accuracy. Use when users want to build 
  a skill, write a SKILL.md, write handler code, evaluate skill quality, optimize 
  skill metadata, or generate test cases. Covers the full skill development lifecycle 
  from intent capture through deployment and iteration. Even if the user just says 
  "I have an idea for a skill" or "help me package this as a skill", this is the right tool.
allowed-tools:
  - Read
  - Write
  - Bash(curl *)
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
  version: "1.0.0"
  source: "https://github.com/anthropics/skills/tree/main/skills/skill-creator"
  license: "MIT"
---

# Skill Creator

Build production-ready AI agent skills for the Claw0x platform. From a one-sentence idea to a deployed, billed, security-scanned skill — this guide and API cover the full lifecycle.

> **Free to use.** This skill costs nothing. [Sign up at claw0x.com](https://claw0x.com), create an API key, and start calling. No credit card required.

## Quick Reference

| When This Happens | Use This Action | What You Get |
|-------------------|-----------------|--------------|
| "I have an idea for a skill" | `create` | Complete SKILL.md + handler skeleton |
| "This skill doc needs work" | `improve` | Refined SKILL.md with before/after scores |
| "Is this skill ready to deploy?" | `evaluate` | Quality scores across 4 dimensions |
| "Agents aren't triggering my skill" | `optimize-description` | Rewritten description for better discovery |
| "I need test cases" | `generate-tests` | Should-trigger and should-not-trigger prompts |

---

## 5-Minute Quickstart

### Step 1: Get API Key (30 seconds)
Sign up at [claw0x.com](https://claw0x.com) → Dashboard → Create API Key

### Step 2: Create Your First Skill (2 minutes)
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer ck_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "skill-creator",
    "input": {
      "action": "create",
      "intent": "I want a skill that validates email addresses"
    }
  }'
```

### Step 3: Get Complete SKILL.md + Handler (instant)
```json
{
  "skill_md": "---\nname: email-validator\ndescription: Validate email addresses...",
  "handler_skeleton": "import { VercelRequest, VercelResponse }...",
  "evaluation": {
    "completeness": 0.85,
    "clarity": 0.9
  }
}
```

### Step 4: Deploy and Test
Copy the generated files, deploy to Vercel, and you're live!

**Done.** You just created a production-ready skill in 5 minutes.

## How Claw0x Skills Work — Architecture in 60 Seconds

Every skill on Claw0x follows the same pattern:

```
Agent → POST https://api.claw0x.com/v1/call → Gateway → skill backend → Response
```

1. An AI agent (or human) calls the Gateway with a Claw0x API key
2. The Gateway authenticates, routes to the skill backend, and handles billing
3. The skill backend runs the handler and returns a result
4. Only 2xx responses are billed. 4xx/5xx = free. Zero risk for the caller.

The caller never needs upstream API keys. One key, one endpoint, zero config.

## Skill Directory Structure

Every skill lives in a standard directory:

```
skills/{slug}/
├── SKILL.md       # Agent discovery entry point (required)
└── handler.ts     # Serverless function logic (required)
```

- `SKILL.md` is what agents read to decide whether to invoke the skill
- `handler.ts` is the actual execution logic, deployed as a Vercel serverless function

## Two Types of Skills

### API Wrapper Skills
Wrap an external API behind the Claw0x Gateway. The handler calls the upstream API using a server-side key that the caller never sees.
**Pure Logic Skills** have no external API calls. All processing happens inside the handler. Cheaper (50% discount) and get free-tier allocation. Example: `sentiment` does regex + heuristic analysis locally. `skill-creator` (this skill) is also pure logic.

## Stage 1: Capture Intent Gemini for AI text rewriting.

### Pure Logic Skills
No external API calls. All processing happens inside the handler. These are cheaper (50% discount) and get free-tier allocation.

Example: `sentiment` does regex + heuristic analysis locally. `skill-creator` (this skill) is also pure logic.

## Stage 1: Capture Intent

Before writing any code, answer these six questions. They determine everything downstream.

1. **What does this skill do in one sentence?**
   A concrete action. "Extracts structured data from PDF invoices and returns JSON" — not "AI-powered document intelligence."

2. **When should an agent invoke this skill?**
   List 3-5 specific trigger phrases. These become the foundation of your `description` field.

3. **What inputs does it need?**
   Every field: name, type, required/optional, constraints.

4. **What does the output look like?**
   The exact JSON shape including `_meta` with `skill`, `version`, and `latency_ms`.

5. **Does it need an upstream API?**
   Yes → API Wrapper. No → Pure Logic (cheaper, simpler).

6. **What can go wrong?**
   List failure modes. Each needs a specific error code and message.

### Why This Matters

A skill with a vague intent produces a vague description, which produces poor triggering, which means agents never invoke it. The six questions force precision upfront.

## Stage 2: Write the SKILL.md

The SKILL.md is the single most important file. It's what agents read to decide whether to use your skill.

### Frontmatter Rules

```yaml
---
name: your-skill-slug
description: >
  [Action verb] [what it does]. Use when [trigger phrase 1],
  [trigger phrase 2], or [trigger phrase 3]. [What it handles/returns].
  Even if the user [edge case phrasing], this skill applies.
allowed-tools: Bash(curl *)
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
  version: "1.0.0"
---
```

**Description field rules (critical for triggering):**

- Start with an action verb: "Extract", "Rewrite", "Analyze", "Generate", "Validate"
- Focus on what the skill does, not implementation details
- Add "Use when..." followed by 3-5 natural-language trigger phrases
- End with an edge-case catch: "Even if the user just says X, this skill applies"
- Target 30-50 words. Under 20 = agents miss it. Over 60 = agents get confused.
- Be pushy — actively claim territory. "Use when users mention anything related to email validation, address checking, or deliverability" beats "Validates email addresses."

**Why pushy descriptions work:** Agents match skills by scanning descriptions against user intent. A conservative description only triggers on exact matches. A pushy description catches the long tail of how users actually phrase requests.

### Required Sections

Every SKILL.md must include these sections in order:

1. **Title + one-line summary**
2. **How It Works — Under the Hood** — explain the actual mechanism. If it's an LLM wrapper, say so. Transparency builds trust.
3. **Prerequisites** — always `CLAW0X_API_KEY`. If free, say "No credit card required."
4. **When to Use** — 4-6 concrete scenarios using trigger phrases from Stage 1.
5. **API Call** — complete, copy-pasteable `curl` using `https://api.claw0x.com/v1/call`. Never internal routes.
6. **Input** — table with Field, Type, Required, Description columns.
7. **Output** — exact JSON response shape with realistic values, not placeholders.
- Use tables for structured data

## Stage 3: Write the handler.ts the skill can return (400, 401, 500).
10. **Pricing** — per-call price or "Free" explicitly.

### Writing Style

- **Explain the why, not just the what.** Don't just say "Uses regex fallback." Say why: "because LLM APIs can timeout, and a deterministic path ensures the caller always gets a result."
- **Show real examples.** Never use placeholder data like `"result": "..."`. Show actual input and output.
- **Be specific about limitations.** If it can't handle files over 10MB, say so.
- **Keep it under 500 lines.** If you need more, the skill is doing too much — split it.
- **Use tables for structured data.** Input/output fields, error codes, event types.

## Stage 3: Write the handler.ts

The handler is a Vercel serverless function. Every handler follows the same skeleton.

### The Standard Pattern

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    input: { type: 'object', required: true },
  });
  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { input } = validation.data!;
  const startTime = Date.now();

  try {
    const result = doSomething(input);
    return successResponse(res, {
      ...result,
      _meta: { skill: 'your-slug', latency_ms: Date.now() - startTime, version: '1.0.0' },
    });
  } catch (error: any) {
    return errorResponse(res, 'Processing failed', 500, error.message);
  }
}

export default authMiddleware(handler);
```

### Key Rules

- **Always use `authMiddleware`** — validates the Claw0x API key.
- **Always return `_meta`** — the Gateway uses it for billing and analytics.
- **Import from `../../lib/`** — shared libraries live two directories up.
- **Use `successResponse` / `errorResponse`** — consistent formatting and status codes.
- **Handle errors explicitly** — 400 for bad input, 500 for internal failures.

### API Wrapper: add upstream API call

```typescript
const API_KEY = process.env.UPSTREAM_API_KEY;
if (!API_KEY) return errorResponse(res, 'Upstream API key not configured', 500);

const upstream = await fetch('https://api.example.com/endpoint', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({ prompt: input.text }),
});
if (!upstream.ok) return errorResponse(res, 'Upstream API failed', 502);
```

The caller never sees `UPSTREAM_API_KEY`. That's the whole point of the Gateway model.

## Stage 4: Register and Deploy

### Step 1: Seed Script

Create `app/seed-{slug}.mjs` to insert the skill into the database. Must fill all required fields including `delivery_mode: 'both'`, `endpoint_url`, `role`, `status: 'approved'`.

### Step 2: Run Seed + Security Scan (mandatory)

```powershell
node seed-your-slug.mjs
node scan-skill-security.mjs your-slug
```

Security scan is a hard prerequisite. No skill goes live without it.

### Step 3: Deploy

Push the skills repo to trigger Vercel auto-deploy.

### Step 4: Verify

```bash
- Auditing a skill against Claw0x platform standards

## API CallT https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skill": "your-slug", "input": {"action": "..."}}'
```

Should return 200 with valid JSON including `_meta`.

## Stage 5: Test and Iterate

### Triggering Quality Test

1. Write 5 prompts that SHOULD trigger the skill
2. Write 5 prompts that SHOULD NOT trigger the skill
3. Use the `generate-tests` action to get a starting set
4. If triggering accuracy < 80%, rewrite the `description` field using `optimize-description`

### Quality Checklist

- [ ] SKILL.md has all required sections
- [ ] Description is 30-50 words with "Use when..." phrasing
- [ ] API call uses `https://api.claw0x.com/v1/call`
- [ ] Input table documents every field
- [ ] Output shows real JSON, not placeholders
- [ ] handler.ts uses `authMiddleware` and returns `_meta`
- [ ] Security scan passed
- [ ] Gateway test returns 200

---

## Prerequisites

A valid Claw0x API key (`CLAW0X_API_KEY`). Sign up at [claw0x.com](https://claw0x.com) and create a key in your dashboard.

```bash
export CLAW0X_API_KEY="your-api-key-here"
```

No credit card or wallet balance needed — this skill is free.

## When to Use

- Creating a new skill from scratch (SKILL.md + handler.ts)
- Improving or editing an existing skill's documentation
- Evaluating skill quality before deployment
- Optimizing a skill's description for better agent triggering
- Generating test prompts to validate skill behavior
- Auditing a skill against Claw0x platform standards

## API Call

```bash
curl -s -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "skill-creator",
    "input": {
      "action": "create",
      "intent": "I want a skill that extracts structured data from PDFs",
      "output_format": "markdown",
      "context": {
        "target_tools": ["Read", "Write", "Bash"],
        "complexity": "medium"
      }
    }
  }'
```

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | One of: `create`, `improve`, `evaluate`, `optimize-description`, `generate-tests` |
| `intent` | string | Yes (create) | What the skill should do — one clear sentence |
| `skill_md` | string | Yes (improve/evaluate/optimize-description/generate-tests) | Existing SKILL.md content |
| `output_format` | string | No | `markdown` (default) or `json` |
| `context` | object | No | Additional context: `target_tools` (string[]), `complexity` (low/medium/high), `domain` (string) |
| `feedback` | string | No (improve) | Specific feedback on what to change |
| `num_tests` | number | No (generate-tests) | Number of test cases per category (default: 3) |

## Actions

### `create` — Generate a new skill from intent

Takes a one-sentence intent and produces a complete SKILL.md draft with proper frontmatter, all required sections, and a handler.ts skeleton. Also runs an auto-evaluation and returns improvement suggestions.

### `improve` — Refine an existing skill

Takes existing SKILL.md content and optional feedback. Auto-fixes structural issues (missing frontmatter, missing sections, missing CLAW0X_API_KEY declaration). Returns before/after quality scores and a list of changes made.

### `evaluate` — Score skill quality

Analyzes a SKILL.md across four dimensions: completeness (required sections present), clarity (code examples, tables), triggering quality (description field analysis), and structure (frontmatter, env vars). Returns scores 0-1 per dimension plus actionable issues and suggestions.

### `optimize-description` — Improve triggering accuracy

Analyzes the frontmatter `description` field and rewrites it for better agent triggering. Checks word count, "Use when" phrasing, action verbs, and edge-case coverage. Returns the original and optimized descriptions with specific tips.

### `generate-tests` — Create test prompts

Generates realistic test prompts in two categories: should-trigger (direct mentions, synonyms, complex queries) and should-not-trigger (unrelated domains, similar-but-wrong tasks). Use these to validate that agents invoke the skill correctly.

## Output

### `create` response

```json
{
  "action": "create",
  "name": "PDF Data Extractor",
  "slug": "pdf-data-extractor",
  "skill_md": "---\nname: pdf-data-extractor\ndescription: Extract structured data from PDF documents...\n---\n\n# PDF Data Extractor\n...",
  "handler_skeleton": "import { VercelRequest, VercelResponse } from '@vercel/node';\n...",
  "evaluation": {
    "completeness": 0.85,
    "clarity": 0.9,
    "triggering_quality": 0.8
  },
  "suggestions": [
    "Add error handling for corrupt PDFs",
    "Include example output with realistic invoice data"
  ],
  "_meta": { "skill": "skill-creator", "version": "1.0.0", "latency_ms": 42 }
}
```

### `evaluate` response

```json
{
  "action": "evaluate",
  "scores": {
    "completeness": 0.8,
    "clarity": 0.7,
    "triggering_quality": 0.6,
    "structure": 0.9,
    "overall": 0.75
  },
  "issues": [
    "Missing section: \"Error Codes\"",
    "Description is too short for reliable triggering"
  ],
  "suggestions": [
    "Add \"Use when...\" phrasing to description",
    "Include action verbs (extract, generate, analyze)"
  ],
  "_meta": { "skill": "skill-creator", "version": "1.0.0", "latency_ms": 15 }
}
```

## Example — Create Action

**Request:**
```json
{
  "skill": "skill-creator",
  "input": {
    "action": "create",
    "intent": "I want a skill that validates email addresses and checks deliverability",
    "context": { "target_tools": ["Bash"], "complexity": "low" }
  }
}
```

**Response includes:** a complete SKILL.md with pushy description, all required sections, a handler.ts skeleton, quality scores, and improvement suggestions. Then use `evaluate` to score it, `optimize-description` to improve triggering, and `generate-tests` to create validation prompts.

## Error Codes

| Code | Meaning | When |
|------|---------|------|
| `400` | Invalid input | Missing required fields, unknown action |
| `401` | Unauthorized | Invalid or missing API key |
| `500` | Processing failed | Internal error (not billed) |

## Pricing

**Free.** This is a pure logic skill with no upstream API costs. Only your Claw0x API key is needed.

```yaml
---
name: your-skill-slug
description: >
  [Action verb] [what it does]. Use when [trigger phrase 1],
  [trigger phrase 2], or [trigger phrase 3]. [What it handles/returns].
  Even if the user [edge case phrasing], this skill applies.
allowed-tools: Bash(curl *)
metadata:
  requires:
    env:
      - CLAW0X_API_KEY
  version: "1.0.0"
---
```

**Description field rules (critical for triggering):**

- Start with an action verb: "Extract", "Rewrite", "Analyze", "Generate", "Validate"
- Focus on what the skill does, not implementation details
- Add "Use when..." followed by 3-5 natural-language trigger phrases
- End with an edge-case catch: "Even if the user just says X, this skill applies"
- Target 30-50 words. Under 20 = agents miss it. Over 60 = agents get confused.
- Be pushy — actively claim territory. "Use when users mention anything related to email validation, address checking, or deliverability" beats "Validates email addresses."

**Why pushy descriptions work:** Agents match skills by scanning descriptions against user intent. A conservative description only triggers on exact matches. A pushy description catches the long tail of how users actually phrase requests.

### Required Sections

Every SKILL.md must include these sections in order:

1. **Title + one-line summary**
2. **How It Works — Under the Hood** — explain the actual mechanism. If it's an LLM wrapper, say so. Transparency builds trust.
3. **Prerequisites** — always `CLAW0X_API_KEY`. If free, say "No credit card required."
4. **When to Use** — 4-6 concrete scenarios using trigger phrases from Stage 1.
5. **API Call** — complete, copy-pasteable `curl` using `https://api.claw0x.com/v1/call`. Never internal routes.
6. **Input** — table with Field, Type, Required, Description columns.
7. **Output** — exact JSON response shape with realistic values, not placeholders.
8. **Example** — at least one complete input→output pair with real data.
9. **Error Codes** — every error the skill can return (400, 401, 500).
10. **Pricing** — per-call price or "Free" explicitly.

### Writing Style

- **Explain the why, not just the what.** Don't just say "Uses regex fallback." Say why: "because LLM APIs can timeout, and a deterministic path ensures the caller always gets a result."
- **Show real examples.** Never use placeholder data like `"result": "..."`. Show actual input and output.
- **Be specific about limitations.** If it can't handle files over 10MB, say so.
- **Keep it under 500 lines.** If you need more, the skill is doing too much — split it.
- **Use tables for structured data.** Input/output fields, error codes, event types.

## Stage 3: Write the handler.ts

The handler is a Vercel serverless function. Every handler follows the same skeleton.

### The Standard Pattern

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    input: { type: 'object', required: true },
  });
  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { input } = validation.data!;
  const startTime = Date.now();

  try {
    const result = doSomething(input);
    return successResponse(res, {
      ...result,
      _meta: { skill: 'your-slug', latency_ms: Date.now() - startTime, version: '1.0.0' },
    });
  } catch (error: any) {
    return errorResponse(res, 'Processing failed', 500, error.message);
  }
}

export default authMiddleware(handler);
```

### Key Rules

- **Always use `authMiddleware`** — validates the Claw0x API key.
- **Always return `_meta`** — the Gateway uses it for billing and analytics.
- **Import from `../../lib/`** — shared libraries live two directories up.
- **Use `successResponse` / `errorResponse`** — consistent formatting and status codes.
- **Handle errors explicitly** — 400 for bad input, 500 for internal failures.

### API Wrapper: add upstream API call

```typescript
const API_KEY = process.env.UPSTREAM_API_KEY;
if (!API_KEY) return errorResponse(res, 'Upstream API key not configured', 500);

const upstream = await fetch('https://api.example.com/endpoint', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({ prompt: input.text }),
});
if (!upstream.ok) return errorResponse(res, 'Upstream API failed', 502);
```

The caller never sees `UPSTREAM_API_KEY`. That's the whole point of the Gateway model.

## Stage 4: Register and Deploy

### Step 1: Seed Script

Create `app/seed-{slug}.mjs` to insert the skill into the database. Must fill all required fields including `delivery_mode: 'both'`, `endpoint_url`, `role`, `status: 'approved'`.

### Step 2: Run Seed + Security Scan (mandatory)

```powershell
node seed-your-slug.mjs
node scan-skill-security.mjs your-slug
```

Security scan is a hard prerequisite. No skill goes live without it.

### Step 3: Deploy

Push the skills repo to trigger Vercel auto-deploy.

### Step 4: Verify

```bash
# Gateway test (production path)
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skill": "your-slug", "input": {"action": "..."}}'
```

Should return 200 with valid JSON including `_meta`.

## Stage 5: Test and Iterate

### Triggering Quality Test

1. Write 5 prompts that SHOULD trigger the skill
2. Write 5 prompts that SHOULD NOT trigger the skill
3. Use the `generate-tests` action to get a starting set
4. If triggering accuracy < 80%, rewrite the `description` field using `optimize-description`

### Quality Checklist

- [ ] SKILL.md has all required sections
- [ ] Description is 30-50 words with "Use when..." phrasing
- [ ] API call uses `https://api.claw0x.com/v1/call`
- [ ] Input table documents every field
- [ ] Output shows real JSON, not placeholders
- [ ] handler.ts uses `authMiddleware` and returns `_meta`
- [ ] Security scan passed
- [ ] Gateway test returns 200

## Prerequisites

A valid Claw0x API key (`CLAW0X_API_KEY`). Sign up at [claw0x.com](https://claw0x.com) and create a key in your dashboard.

```bash
export CLAW0X_API_KEY="your-api-key-here"
```

No credit card or wallet balance needed — this skill is free.

## When to Use

- Creating a new skill from scratch (SKILL.md + handler.ts)
- Improving or editing an existing skill's documentation
- Evaluating skill quality before deployment
- Optimizing a skill's description for better agent triggering
- Generating test prompts to validate skill behavior
- Auditing a skill against Claw0x platform standards
