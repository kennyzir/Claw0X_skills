import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Phone Validator
 * Validates, normalizes, and classifies phone numbers globally.
 * Uses pattern matching for format validation and country detection.
 */

interface PhoneResult {
  valid: boolean;
  original: string;
  normalized: string;
  country_code: string | null;
  country: string | null;
  national_number: string;
  type: string;
  risk_score: number;
}

const COUNTRY_CODES: Record<string, { name: string; lengths: number[] }> = {
  '1': { name: 'US/Canada', lengths: [10] },
  '44': { name: 'United Kingdom', lengths: [10, 11] },
  '86': { name: 'China', lengths: [11] },
  '81': { name: 'Japan', lengths: [10, 11] },
  '49': { name: 'Germany', lengths: [10, 11, 12] },
  '33': { name: 'France', lengths: [9] },
  '61': { name: 'Australia', lengths: [9] },
  '91': { name: 'India', lengths: [10] },
  '55': { name: 'Brazil', lengths: [10, 11] },
  '82': { name: 'South Korea', lengths: [9, 10] },
  '39': { name: 'Italy', lengths: [9, 10] },
  '34': { name: 'Spain', lengths: [9] },
  '7': { name: 'Russia', lengths: [10] },
  '52': { name: 'Mexico', lengths: [10] },
  '65': { name: 'Singapore', lengths: [8] },
  '852': { name: 'Hong Kong', lengths: [8] },
  '886': { name: 'Taiwan', lengths: [9, 10] },
  '971': { name: 'UAE', lengths: [9] },
};

function validatePhone(phone: string): PhoneResult {
  const original = phone;
  // Strip all non-digit except leading +
  let digits = phone.replace(/[^\d+]/g, '');
  const hasPlus = digits.startsWith('+');
  digits = digits.replace(/\D/g, '');

  if (digits.length < 7 || digits.length > 15) {
    return {
      valid: false, original, normalized: '', country_code: null,
      country: null, national_number: digits, type: 'unknown', risk_score: 90,
    };
  }

  // Detect country code
  let countryCode: string | null = null;
  let countryName: string | null = null;
  let nationalNumber = digits;

  if (hasPlus || digits.length > 10) {
    for (const len of [3, 2, 1]) {
      const prefix = digits.substring(0, len);
      if (COUNTRY_CODES[prefix]) {
        countryCode = prefix;
        countryName = COUNTRY_CODES[prefix].name;
        nationalNumber = digits.substring(len);
        break;
      }
    }
  }

  // If no country code detected and 10 digits, assume US
  if (!countryCode && digits.length === 10) {
    countryCode = '1';
    countryName = 'US/Canada';
    nationalNumber = digits;
  }

  // Validate length
  let validLength = true;
  if (countryCode && COUNTRY_CODES[countryCode]) {
    validLength = COUNTRY_CODES[countryCode].lengths.includes(nationalNumber.length);
  }

  // Classify type
  let type = 'unknown';
  if (countryCode === '1' && nationalNumber.length === 10) {
    const areaCode = nationalNumber.substring(0, 3);
    if (['800', '888', '877', '866', '855', '844', '833'].includes(areaCode)) type = 'toll_free';
    else if (['900'].includes(areaCode)) type = 'premium';
    else type = 'mobile_or_landline';
  } else {
    type = 'mobile_or_landline';
  }

  const normalized = countryCode ? `+${countryCode}${nationalNumber}` : `+${digits}`;
  const valid = validLength && nationalNumber.length >= 7;

  return {
    valid,
    original,
    normalized: valid ? normalized : '',
    country_code: countryCode,
    country: countryName,
    national_number: nationalNumber,
    type,
    risk_score: valid ? (type === 'premium' ? 60 : 10) : 80,
  };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    phone: { type: 'string', required: true, min: 5, max: 30 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { phone } = validation.data!;

  try {
    const startTime = Date.now();
    const result = validatePhone(phone);

    return successResponse(res, {
      ...result,
      _meta: {
        skill: 'phone-validator',
        latency_ms: Date.now() - startTime,
      },
    });
  } catch (error: any) {
    console.error('Phone validation error:', error);
    return errorResponse(res, 'Phone validation failed', 500, error.message);
  }
}

export default authMiddleware(handler);
