---
name: "Context Enhancement"
slug: "context-enhancement"
description: >
  Learn from user answers and build persistent context. Use when agents need to 
  remember user preferences, detect patterns in responses, and reduce repeated 
  questions. Handles preference learning, pattern detection, and context management.
category: "AI Tools"
tags: ["context", "learning", "preferences", "patterns", "memory", "agent-intelligence"]
price_per_call: 0
input_schema:
  type: object
  properties:
    action:
      type: string
      enum: ["analyze-answer", "get-context", "update-context", "detect-patterns"]
      description: "Action to perform"
    question:
      type: string
      description: "Question that was asked (for analyze-answer)"
    context:
      type: string
      description: "Context of the question (for analyze-answer)"
    answer:
      type: string
      description: "User's answer (for analyze-answer)"
    user_id:
      type: string
      description: "User identifier (optional, defaults to 'default')"
    scope:
      type: string
      enum: ["preferences", "patterns", "rules", "all"]
      description: "Scope of context to retrieve (for get-context)"
    updates:
      type: object
      description: "Context updates to apply (for update-context)"
    history_days:
      type: number
      description: "Number of days of history to analyze (for detect-patterns)"
  required: ["action"]
output_schema:
  type: object
  properties:
    pattern_detected:
      type: string
      description: "Type of pattern detected"
    confidence:
      type: number
      description: "Confidence score (0-1)"
    suggested_rule:
      type: string
      description: "Suggested rule based on pattern"
    context_update:
      type: object
      description: "Updates to apply to user context"
    context:
      type: object
      description: "User context (for get-context)"
    patterns:
      type: array
      description: "Detected patterns (for detect-patterns)"
    _meta:
      type: object
      properties:
        skill:
          type: string
        latency_ms:
          type: number
---

# Context Enhancement

Learn from user answers to detect patterns and build persistent context that reduces repeated questions.

> **FREE.** No charge per call. Requires Claw0x API key for authentication.

## What It Does

Context Enhancement analyzes user answers to detect patterns and build a persistent context layer that:
- Remembers user preferences (language, code style, deployment strategy)
- Detects patterns in responses (e.g., "always use TypeScript", "deploy to staging first")
- Generates rules based on detected patterns
- Reduces repeated questions by learning from past interactions

## Prerequisites

**IMPORTANT**: This is the server-side version that runs through Claw0x Gateway. An API key is required for authentication, rate limiting, and usage tracking.

1. **Sign up at [claw0x.com](https://claw0x.com)**
2. **Create API key** in Dashboard
3. **Set environment variable**:
   ```bash
   export CLAW0X_API_KEY="ck_live_..."
   ```

**Note**: For local use without API key, install via ClawHub: `openclaw skills install context-enhancement`

## Pricing

**FREE.** No charge per call.

- Requires Claw0x API key for authentication
- No usage charges (price_per_call = 0)
- Unlimited calls
- Used for rate limiting and usage tracking

## Use Cases

### Scenario 1: Code Style Preferences
**Problem**: Agent asks "Use single or double quotes?" every time  
**Solution**: After first answer, Context Enhancement detects pattern and remembers preference  
**Result**: Agent automatically uses preferred style without asking

### Scenario 2: Deployment Strategy
**Problem**: Agent doesn't remember user's deployment workflow  
**Solution**: Learns from answers like "Always deploy to staging first"  
**Result**: Agent follows learned deployment strategy automatically

### Scenario 3: Language Preferences
**Problem**: Agent asks "TypeScript or JavaScript?" for every new file  
**Solution**: Detects language preference pattern from past answers  
**Result**: Agent defaults to preferred language

### Scenario 4: Team Context Sharing
**Problem**: Each team member has to teach the agent their preferences  
**Solution**: Context can be shared across team members  
**Result**: Consistent behavior across team

## Quick Reference

| When This Happens | Do This | What You Get |
|-------------------|---------|--------------|
| User answers preference question | `analyze-answer` | Pattern detection + rule generation |
| Need to check user preferences | `get-context` | Current user context |
| Want to update context manually | `update-context` | Updated context |
| Want to see all detected patterns | `detect-patterns` | List of patterns with confidence scores |

## 5-Minute Quickstart

### Step 1: Get API Key (30 seconds)
Sign up at [claw0x.com](https://claw0x.com) → Dashboard → Create API Key

### Step 2: Set Environment Variable (30 seconds)
```bash
export CLAW0X_API_KEY="ck_live_..."
```

### Step 3: Analyze First Answer (1 minute)
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "context-enhancement",
    "input": {
      "action": "analyze-answer",
      "question": "Use TypeScript or JavaScript?",
      "context": "Creating auth endpoint",
      "answer": "TypeScript",
      "user_id": "user_123"
    }
  }'
```

### Step 4: See Pattern Detection (instant)
```json
{
  "pattern_detected": "language_preference",
  "confidence": 0.95,
  "suggested_rule": "User prefers TypeScript for new code",
  "context_update": {
    "preferences.language": "TypeScript",
    "preferences.use_cases": ["Creating auth endpoint"]
  },
  "_meta": {
    "skill": "context-enhancement",
    "latency_ms": 15
  }
}
```

### Step 5: Get Context (instant)
```bash
curl -X POST https://api.claw0x.com/v1/call \
  -H "Authorization: Bearer $CLAW0X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "context-enhancement",
    "input": {
      "action": "get-context",
      "user_id": "user_123"
    }
  }'
```

## Real-World Use Cases

### Scenario 1: Onboarding New Agent
**Problem**: New agent doesn't know user preferences  
**Solution**: Use Context Enhancement to learn from first interactions  
**Example**:
```typescript
// First interaction
await claw0x.call('context-enhancement', {
  action: 'analyze-answer',
  question: 'Preferred code style?',
  answer: 'Single quotes, no semicolons',
  user_id: 'user_123'
});

// Later interactions - agent checks context
const context = await claw0x.call('context-enhancement', {
  action: 'get-context',
  user_id: 'user_123',
  scope: 'preferences'
});
// context.preferences.code_style.quotes === 'single'
```

### Scenario 2: Reducing Repeated Questions
**Problem**: Agent asks same questions repeatedly  
**Solution**: Detect patterns and generate rules  
**Example**:
```typescript
// After 3 similar answers, pattern is detected
await claw0x.call('context-enhancement', {
  action: 'detect-patterns',
  user_id: 'user_123'
});
// Returns: [
//   {
//     pattern: 'deployment_strategy',
//     frequency: 3,
//     confidence: 0.98,
//     suggested_rule: 'Always deploy to staging first'
//   }
// ]
```

### Scenario 3: Team Context Sharing
**Problem**: Each team member has different preferences  
**Solution**: Use team-level context  
**Example**:
```typescript
// Team lead sets preferences
await claw0x.call('context-enhancement', {
  action: 'update-context',
  user_id: 'team_acme',
  updates: {
    'preferences.language': 'TypeScript',
    'preferences.deployment': 'staging-first',
    'preferences.code_style.quotes': 'single'
  }
});

// All team members inherit team context
const teamContext = await claw0x.call('context-enhancement', {
  action: 'get-context',
  user_id: 'team_acme'
});
```

### Scenario 4: Progressive Learning
**Problem**: Agent needs to learn complex workflows  
**Solution**: Analyze multiple interactions to detect patterns  
**Example**:
```typescript
// Interaction 1
await claw0x.call('context-enhancement', {
  action: 'analyze-answer',
  question: 'Run tests before deploy?',
  answer: 'Yes, always',
  user_id: 'user_123'
});

// Interaction 2
await claw0x.call('context-enhancement', {
  action: 'analyze-answer',
  question: 'Deploy to staging first?',
  answer: 'Yes',
  user_id: 'user_123'
});

// Pattern detected: deployment_strategy
// Rule generated: "Run tests, then deploy to staging, then production"
```

## Integration Recipes

### OpenClaw Agent
```typescript
import { Claw0xClient } from '@claw0x/sdk';

const claw0x = new Claw0xClient(process.env.CLAW0X_API_KEY);

agent.onQuestion(async (question, context, answer) => {
  // Analyze answer to detect patterns
  const result = await claw0x.call('context-enhancement', {
    action: 'analyze-answer',
    question,
    context,
    answer,
    user_id: agent.userId
  });
  
  if (result.pattern_detected) {
    console.log(`Pattern detected: ${result.pattern_detected}`);
    console.log(`Rule: ${result.suggested_rule}`);
  }
});

agent.beforeAction(async (action) => {
  // Check context before taking action
  const context = await claw0x.call('context-enhancement', {
    action: 'get-context',
    user_id: agent.userId,
    scope: 'preferences'
  });
  
  // Apply preferences to action
  if (context.preferences.language) {
    action.language = context.preferences.language;
  }
});
```

### LangChain Agent
```python
from claw0x import Claw0xClient

claw0x = Claw0xClient(api_key=os.environ['CLAW0X_API_KEY'])

def analyze_answer(question, context, answer, user_id):
    result = claw0x.call('context-enhancement', {
        'action': 'analyze-answer',
        'question': question,
        'context': context,
        'answer': answer,
        'user_id': user_id
    })
    
    if result['pattern_detected']:
        print(f"Pattern: {result['pattern_detected']}")
        print(f"Rule: {result['suggested_rule']}")
    
    return result

def get_user_context(user_id):
    return claw0x.call('context-enhancement', {
        'action': 'get-context',
        'user_id': user_id,
        'scope': 'all'
    })
```

### Custom Agent
```javascript
const axios = require('axios');

async function enhanceContext(question, answer, userId) {
  const response = await axios.post('https://api.claw0x.com/v1/call', {
    skill: 'context-enhancement',
    input: {
      action: 'analyze-answer',
      question,
      answer,
      user_id: userId
    }
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.CLAW0X_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
}

async function getUserPreferences(userId) {
  const response = await axios.post('https://api.claw0x.com/v1/call', {
    skill: 'context-enhancement',
    input: {
      action: 'get-context',
      user_id: userId,
      scope: 'preferences'
    }
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.CLAW0X_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.context.preferences;
}
```

## Workflow Diagram

```
User Answer
  ↓
Context Enhancement (analyze-answer)
  ↓
Pattern Detection
  ├─ Language Preference (confidence: 0.95)
  ├─ Deployment Strategy (confidence: 0.98)
  ├─ Code Style (confidence: 0.92)
  └─ Generic Preference (confidence: 0.7)
  ↓
Rule Generation
  ├─ "User prefers TypeScript"
  ├─ "Deploy to staging first"
  └─ "Use single quotes"
  ↓
Context Update
  ├─ preferences.language = "TypeScript"
  ├─ preferences.deployment = "staging-first"
  └─ preferences.code_style.quotes = "single"
  ↓
Agent Uses Context
  ├─ Checks preferences before asking
  ├─ Applies learned rules automatically
  └─ Reduces repeated questions
```

## Why Use Via Claw0x?

- **Unified infrastructure**: One API key for all skills
- **Agent-optimized**: Built specifically for agent context management
- **Production-ready**: 99.9% uptime, <20ms latency
- **Free**: No usage charges (price_per_call = 0)
- **Privacy**: Context stored securely, isolated per user

## Input Parameters

### analyze-answer
- `action`: "analyze-answer" (required)
- `question`: Question that was asked (required)
- `context`: Context of the question (optional)
- `answer`: User's answer (required)
- `user_id`: User identifier (optional, defaults to "default")

### get-context
- `action`: "get-context" (required)
- `user_id`: User identifier (optional)
- `scope`: "preferences" | "patterns" | "rules" | "all" (optional, defaults to "all")

### update-context
- `action`: "update-context" (required)
- `user_id`: User identifier (optional)
- `updates`: Object with context updates (required)

### detect-patterns
- `action`: "detect-patterns" (required)
- `user_id`: User identifier (optional)
- `history_days`: Number of days to analyze (optional, defaults to 30)

## Output Format

### analyze-answer
```json
{
  "pattern_detected": "language_preference",
  "confidence": 0.95,
  "suggested_rule": "User prefers TypeScript for new code",
  "context_update": {
    "preferences.language": "TypeScript"
  },
  "_meta": {
    "skill": "context-enhancement",
    "latency_ms": 15
  }
}
```

### get-context
```json
{
  "context": {
    "preferences": {
      "language": "TypeScript",
      "deployment": "staging-first"
    },
    "patterns": [
      {
        "pattern": "language_preference",
        "confidence": 0.95,
        "examples": ["Creating auth endpoint"],
        "rule": "User prefers TypeScript"
      }
    ],
    "rules": [
      "User prefers TypeScript for new code",
      "Deploy to staging first"
    ]
  },
  "_meta": {
    "skill": "context-enhancement",
    "latency_ms": 10
  }
}
```

### detect-patterns
```json
{
  "patterns": [
    {
      "pattern": "language_preference",
      "frequency": 5,
      "confidence": 0.95,
      "suggested_rule": "User prefers TypeScript"
    },
    {
      "pattern": "deployment_strategy",
      "frequency": 3,
      "confidence": 0.98,
      "suggested_rule": "Deploy to staging first"
    }
  ],
  "_meta": {
    "skill": "context-enhancement",
    "latency_ms": 12
  }
}
```

## Error Handling

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 400 | Invalid input or missing required fields | Check input schema |
| 401 | Missing or invalid API key | Set CLAW0X_API_KEY |
| 500 | Internal error (not billed) | Retry or contact support |

## Pattern Detection Types

| Pattern | Trigger | Confidence | Example Rule |
|---------|---------|------------|--------------|
| `language_preference` | TypeScript/JavaScript questions | 0.95 | "User prefers TypeScript" |
| `deployment_strategy` | Deployment workflow questions | 0.98 | "Deploy to staging first" |
| `code_style` | Code style questions | 0.92 | "Use single quotes, no semicolons" |
| `generic_preference` | Any other question | 0.7 | "User answered X for Y" |

## Best Practices

1. **Use consistent user_id**: Same user_id across sessions to maintain context
2. **Provide context**: Include context field for better pattern detection
3. **Check confidence**: Only apply rules with confidence > 0.8
4. **Review patterns**: Periodically call `detect-patterns` to review learned patterns
5. **Team context**: Use team-level user_id for shared preferences

## Limitations

- Context stored in memory (use database for production)
- Pattern detection is rule-based (not ML-based)
- Limited to predefined pattern types
- No automatic context expiration

## Complementary Skills

- **btw**: Ask clarifying questions before context is built
- **self-improving-agent**: Learn from errors and corrections
- **capability-evolver**: Analyze and improve agent capabilities

## About Claw0x

This skill is provided by [Claw0x](https://claw0x.com), the native skills layer for AI agents.

**Explore more skills**: [claw0x.com/skills](https://claw0x.com/skills)

**GitHub**: [github.com/claw0x/context-enhancement](https://github.com/claw0x/context-enhancement)
