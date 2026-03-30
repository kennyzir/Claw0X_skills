import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Entity Extractor (NER)
 * Extracts people, organizations, locations, dates, emails, URLs, and
 * monetary values from unstructured text using pattern matching + heuristics.
 */

interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
}

function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  // Emails
  const emailRe = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  for (const m of text.matchAll(emailRe)) {
    entities.push({ text: m[0], type: 'EMAIL', start: m.index!, end: m.index! + m[0].length });
  }

  // URLs
  const urlRe = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  for (const m of text.matchAll(urlRe)) {
    entities.push({ text: m[0], type: 'URL', start: m.index!, end: m.index! + m[0].length });
  }

  // Dates (various formats)
  const dateRe = /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi;
  for (const m of text.matchAll(dateRe)) {
    entities.push({ text: m[0], type: 'DATE', start: m.index!, end: m.index! + m[0].length });
  }

  // Money
  const moneyRe = /[$€£¥]\s?\d[\d,]*\.?\d*\b|\b\d[\d,]*\.?\d*\s?(?:USD|EUR|GBP|JPY|CNY)\b/gi;
  for (const m of text.matchAll(moneyRe)) {
    entities.push({ text: m[0], type: 'MONEY', start: m.index!, end: m.index! + m[0].length });
  }

  // Phone numbers
  const phoneRe = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
  for (const m of text.matchAll(phoneRe)) {
    if (m[0].replace(/\D/g, '').length >= 7) {
      entities.push({ text: m[0].trim(), type: 'PHONE', start: m.index!, end: m.index! + m[0].length });
    }
  }

  // Capitalized multi-word phrases → likely PERSON or ORG
  const nameRe = /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  for (const m of text.matchAll(nameRe)) {
    const phrase = m[0];
    // Skip if already captured as another entity
    const overlap = entities.some(e => m.index! >= e.start && m.index! < e.end);
    if (overlap) continue;

    const locationIndicators = ['Street', 'Avenue', 'Road', 'City', 'County', 'State', 'Park', 'Lake', 'Mountain', 'River', 'Island', 'Bay'];
    const orgIndicators = ['Inc', 'Corp', 'Ltd', 'LLC', 'Company', 'Group', 'Foundation', 'Institute', 'University', 'Association'];

    let type = 'PERSON';
    if (orgIndicators.some(w => phrase.includes(w))) type = 'ORGANIZATION';
    else if (locationIndicators.some(w => phrase.includes(w))) type = 'LOCATION';

    entities.push({ text: phrase, type, start: m.index!, end: m.index! + phrase.length });
  }

  // Sort by position
  entities.sort((a, b) => a.start - b.start);
  return entities;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    text: { type: 'string', required: true, min: 1, max: 50000 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { text } = validation.data!;

  try {
    const startTime = Date.now();
    const entities = extractEntities(text);

    // Group by type
    const grouped: Record<string, string[]> = {};
    for (const e of entities) {
      if (!grouped[e.type]) grouped[e.type] = [];
      if (!grouped[e.type].includes(e.text)) grouped[e.type].push(e.text);
    }

    return successResponse(res, {
      entities,
      grouped,
      total_count: entities.length,
      type_counts: Object.fromEntries(
        Object.entries(grouped).map(([k, v]) => [k, v.length])
      ),
      _meta: {
        skill: 'entity-extractor',
        latency_ms: Date.now() - startTime,
        text_length: text.length,
      },
    });
  } catch (error: any) {
    console.error('Entity extraction error:', error);
    return errorResponse(res, 'Entity extraction failed', 500, error.message);
  }
}

export default authMiddleware(handler);
