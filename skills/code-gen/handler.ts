import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * code-gen — AI Skill Code Generator
 *
 * Generates production-ready Vercel Serverless Function code for a skill
 * based on its README, description, evaluation data, and source repo info.
 *
 * Uses Gemini to produce real implementation code (not stubs).
 * Called internally by the review/approve flow.
 */

const SYSTEM_PROMPT = `You are a senior backend engineer generating production-ready TypeScript code for a Vercel Serverless Function.

The code MUST follow this exact structure:

\`\`\`typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Input validation using validateInput
  // Core logic implementation
  // Return via successResponse or errorResponse
}

export default authMiddleware(handler);
\`\`\`

RULES:
1. ONLY output the TypeScript code. No markdown fences, no explanations.
2. Import ONLY from '@vercel/node' and '../../lib/{auth,validation,response}'.
3. For external HTTP calls, use native fetch() — do NOT import axios or other libs.
4. Environment variables: use process.env.GEMINI_API_KEY for LLM calls, or process.env.{SLUG}_API_KEY for upstream APIs.
5. The handler receives POST requests with JSON body. Use validateInput for input validation.
6. Always measure latency and include _meta in the response.
7. Include a regex/deterministic fallback if the skill uses an LLM, so it works even without API keys.
8. Handle errors gracefully — never throw unhandled exceptions.
9. The code must be complete and immediately deployable — no TODOs, no placeholders.
10. If the skill wraps an external API, implement the actual API call with proper error handling.
11. If the skill is pure logic (sentiment, validation, parsing), implement the actual algorithm.
12. Keep the code concise but functional. Prefer simple, correct code over clever abstractions.`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const { input } = req.body || {};

  if (!input || !input.slug || !input.name) {
    return errorResponse(res, 'input.slug and input.name are required', 400);
  }

  const {
    slug,
    name,
    description,
    readme_content,
    source_url,
    topics,
    needs_upstream_api,
    evaluation_details,
  } = input;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(res, 'GEMINI_API_KEY not configured', 500);
  }

  const userPrompt = buildPrompt({
    slug, name, description, readme_content,
    source_url, topics, needs_upstream_api, evaluation_details,
  });

  const startTime = Date.now();

  try {
    const model = 'gemini-3.1-flash-lite-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.3,
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return errorResponse(res, `Gemini API error: ${geminiRes.status}`, 502, err);
    }

    const data: any = await geminiRes.json();
    let code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!code) {
      return errorResponse(res, 'Gemini returned empty response', 502);
    }

    // Strip markdown fences if Gemini wrapped the code
    code = code.replace(/^```(?:typescript|ts)?\n?/m, '').replace(/\n?```\s*$/m, '').trim();

    // Basic validation: must have the required imports and export
    if (!code.includes('authMiddleware') || !code.includes('export default')) {
      return errorResponse(res, 'Generated code missing required structure (authMiddleware + export default)', 422);
    }

    const latencyMs = Date.now() - startTime;

    return successResponse(res, {
      code,
      slug,
      lines: code.split('\n').length,
      has_fallback: code.includes('fallback') || code.includes('regex') || code.includes('Fallback'),
      _meta: {
        skill: 'code-gen',
        latency_ms: latencyMs,
        model,
      },
    });
  } catch (error: any) {
    console.error('[code-gen] Error:', error.message);
    return errorResponse(res, 'Code generation failed', 500, error.message);
  }
}

function buildPrompt(ctx: {
  slug: string;
  name: string;
  description: string;
  readme_content?: string;
  source_url?: string;
  topics?: string[];
  needs_upstream_api?: boolean;
  evaluation_details?: any;
}): string {
  const parts: string[] = [
    `Generate a complete TypeScript handler for the skill "${ctx.name}" (slug: ${ctx.slug}).`,
    '',
    `Description: ${ctx.description || 'N/A'}`,
  ];

  if (ctx.source_url) {
    parts.push(`Source repo: ${ctx.source_url}`);
  }
  if (ctx.topics?.length) {
    parts.push(`Topics/tags: ${ctx.topics.join(', ')}`);
  }
  if (ctx.needs_upstream_api) {
    parts.push(`This skill wraps an external API. Use process.env.${ctx.slug.toUpperCase().replace(/-/g, '_')}_API_URL and _API_KEY.`);
  } else {
    parts.push('This skill uses pure logic — no external API calls needed. Implement the actual algorithm.');
  }
  if (ctx.evaluation_details?.build_recommendation) {
    parts.push(`Build recommendation: ${ctx.evaluation_details.build_recommendation}`);
  }
  if (ctx.evaluation_details?.ai_reasoning) {
    parts.push(`AI evaluation notes: ${ctx.evaluation_details.ai_reasoning}`);
  }
  if (ctx.readme_content) {
    parts.push('', '--- README CONTENT (use this to understand what the skill should do) ---', ctx.readme_content.slice(0, 6000));
  }

  return parts.join('\n');
}

export default authMiddleware(handler);
