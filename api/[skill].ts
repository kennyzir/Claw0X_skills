import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Unified skill router — single Serverless Function that dispatches
 * to all skill handlers under ../skills/.
 *
 * URL: /api/{skill-name}  →  routes to the matching skill handler
 *
 * This bypasses Vercel Hobby's 12 Serverless Function limit by
 * consolidating all skills behind one dynamic route.
 *
 * NOTE: We use static imports (not dynamic import()) because Vercel
 * bundles each api/ function independently. Dynamic imports to ../skills/
 * fail at runtime since those files aren't in the function's bundle.
 *
 * All skills use directory structure: skills/{slug}/handler.ts + SKILL.md
 */

import agentmail from '../skills/agentmail/handler';
import awesomeOpenclawSkills from '../skills/awesome-openclaw-skills/handler';
import capabilityEvolver from '../skills/capability-evolver/handler';
import codeGen from '../skills/code-gen/handler';
import humanizer from '../skills/humanizer/handler';
import parsePdf from '../skills/parse-pdf/handler';
import scrape from '../skills/scrape/handler';
import selfImprovingAgent from '../skills/self-improving-agent/handler';
import sentiment from '../skills/sentiment/handler';
import smartSummarizer from '../skills/smart-summarizer/handler';
import skillScout from '../skills/skill-scout/handler';
import tavilySearch from '../skills/tavily-search/handler';
import securityScanner from '../skills/skill-security-scanner/handler';
import skillCreator from '../skills/skill-creator/handler';
import validateEmail from '../skills/validate-email/handler';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const SKILL_MAP: Record<string, Handler> = {
  'agentmail': agentmail,
  'awesome-openclaw-skills': awesomeOpenclawSkills,
  'capability-evolver': capabilityEvolver,
  'code-gen': codeGen,
  'humanizer': humanizer,
  'parse-pdf': parsePdf,
  'scrape': scrape,
  'self-improving-agent': selfImprovingAgent,
  'sentiment': sentiment,
  'smart-summarizer': smartSummarizer,
  'skill-scout': skillScout,
  'tavily-search': tavilySearch,
  'security-scanner': securityScanner,
  'skill-creator': skillCreator,
  'validate-email': validateEmail,
};

export default async function router(req: VercelRequest, res: VercelResponse) {
  const { skill } = req.query;
  const slug = Array.isArray(skill) ? skill[0] : skill;

  if (!slug || !SKILL_MAP[slug]) {
    return res.status(404).json({
      success: false,
      error: `Skill "${slug || ''}" not found`,
      available: Object.keys(SKILL_MAP).sort(),
    });
  }

  return SKILL_MAP[slug](req, res);
}
