import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { validateInput } from '../../lib/validation';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * IP Geolocation
 * Returns country, city, ISP, timezone, and VPN/proxy flag for an IP address.
 * Uses ip-api.com free tier (no API key needed, 45 req/min).
 */

interface GeoResult {
  ip: string;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  as_number: string | null;
  is_proxy: boolean;
  is_mobile: boolean;
}

function isValidIp(ip: string): boolean {
  // IPv4
  const v4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (v4.test(ip)) {
    return ip.split('.').every(n => parseInt(n) >= 0 && parseInt(n) <= 255);
  }
  // IPv6 (simplified check)
  const v6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return v6.test(ip);
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const validation = validateInput(req.body, {
    ip: { type: 'string', required: true, min: 7, max: 45 },
  });

  if (!validation.valid) {
    return errorResponse(res, 'Invalid input', 400, validation.errors);
  }

  const { ip } = validation.data!;

  if (!isValidIp(ip)) {
    return errorResponse(res, 'Invalid IP address format', 400);
  }

  if (isPrivateIp(ip)) {
    return successResponse(res, {
      ip,
      country: null, country_code: null, region: null, city: null,
      zip: null, latitude: null, longitude: null, timezone: null,
      isp: 'Private Network', org: null, as_number: null,
      is_proxy: false, is_mobile: false,
      note: 'Private/reserved IP address — no geolocation available',
      _meta: { skill: 'ip-geolocation', latency_ms: 0 },
    });
  }

  try {
    const startTime = Date.now();

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,mobile`,
      { signal: AbortSignal.timeout(5000) }
    );

    const data = await response.json();

    if (data.status === 'fail') {
      return errorResponse(res, `Geolocation failed: ${data.message}`, 400);
    }

    const result: GeoResult = {
      ip,
      country: data.country || null,
      country_code: data.countryCode || null,
      region: data.regionName || null,
      city: data.city || null,
      zip: data.zip || null,
      latitude: data.lat || null,
      longitude: data.lon || null,
      timezone: data.timezone || null,
      isp: data.isp || null,
      org: data.org || null,
      as_number: data.as || null,
      is_proxy: data.proxy || false,
      is_mobile: data.mobile || false,
    };

    return successResponse(res, {
      ...result,
      _meta: {
        skill: 'ip-geolocation',
        latency_ms: Date.now() - startTime,
      },
    });
  } catch (error: any) {
    console.error('IP geolocation error:', error);
    return errorResponse(res, 'Geolocation lookup failed', 500, error.message);
  }
}

export default authMiddleware(handler);
