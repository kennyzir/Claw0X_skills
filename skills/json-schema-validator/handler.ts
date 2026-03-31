import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * JSON Schema Validator
 * Validate JSON data against a JSON Schema. Returns detailed error paths.
 * Supports: type checking, required fields, enum, min/max, pattern, nested objects, arrays.
 */

interface ValidationError {
  path: string;
  message: string;
  expected?: string;
  actual?: string;
}

function validateValue(value: any, schema: any, path: string, errors: ValidationError[]): void {
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.includes(actualType)) {
      errors.push({ path, message: `Expected type ${types.join('|')}, got ${actualType}`, expected: types.join('|'), actual: actualType });
      return;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}`, expected: schema.enum.join(', '), actual: String(value) });
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push({ path, message: `Value must be ${JSON.stringify(schema.const)}`, expected: String(schema.const), actual: String(value) });
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push({ path, message: `String too short (min ${schema.minLength})` });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push({ path, message: `String too long (max ${schema.maxLength})` });
    if (schema.pattern) { try { if (!new RegExp(schema.pattern).test(value)) errors.push({ path, message: `Does not match pattern: ${schema.pattern}` }); } catch {} }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path, message: `Value below minimum ${schema.minimum}` });
    if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path, message: `Value above maximum ${schema.maximum}` });
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) errors.push({ path, message: `Not a multiple of ${schema.multipleOf}` });
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) errors.push({ path: `${path}.${key}`, message: `Required property missing` });
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) validateValue(value[key], propSchema, `${path}.${key}`, errors);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push({ path: `${path}.${key}`, message: `Additional property not allowed` });
      }
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: `Array too short (min ${schema.minItems} items)` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: `Array too long (max ${schema.maxItems} items)` });
    if (schema.items) { value.forEach((item, i) => validateValue(item, schema.items, `${path}[${i}]`, errors)); }
    if (schema.uniqueItems) {
      const seen = new Set(value.map(v => JSON.stringify(v)));
      if (seen.size !== value.length) errors.push({ path, message: `Array items must be unique` });
    }
  }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const { data, schema } = req.body || {};
  if (data === undefined) return errorResponse(res, 'Missing required field: data', 400);
  if (!schema || typeof schema !== 'object') return errorResponse(res, 'Missing required field: schema (must be a JSON Schema object)', 400);

  try {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    validateValue(data, schema, '$', errors);

    return successResponse(res, {
      valid: errors.length === 0,
      errors,
      error_count: errors.length,
      _meta: { skill: 'json-schema-validator', latency_ms: Date.now() - startTime },
    });
  } catch (error: any) {
    return errorResponse(res, 'Validation failed', 500, error.message);
  }
}

export default authMiddleware(handler);
