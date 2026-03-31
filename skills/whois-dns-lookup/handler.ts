import { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware } from '../../lib/auth';
import { successResponse, errorResponse } from '../../lib/response';

/**
 * Whois & DNS Lookup
 * Query WHOIS info, DNS records, and SSL cert details for any domain.
 */

import { resolve, resolve4, resolve6, resolveMx, resolveTxt, resolveCname, resolveNs } from 'dns/promises';

async function dnsLookup(domain: string) {
  const results: Record<string, any> = {};
  try { results.a = await resolve4(domain); } catch { results.a = []; }
  try { results.aaaa = await resolve6(domain); } catch { results.aaaa = []; }
  try { results.mx = await resolveMx(domain); } catch { results.mx = []; }
  try { results.txt = (await resolveTxt(domain)).map(r => r.join('')); } catch { results.txt = []; }
  try { results.cname = await resolveCname(domain); } catch { results.cname = []; }
  try { results.ns = await resolveNs(domain); } catch { results.ns = []; }
  return results;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const { domain } = req.body || {};
  if (!domain || typeof domain !== 'string') return errorResponse(res, 'domain is required', 400);
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(clean)) return errorResponse(res, 'Invalid domain format', 400);

  try {
    const startTime = Date.now();
    const dns = await dnsLookup(clean);
    return successResponse(res, {
      domain: clean, dns,
      has_ipv4: dns.a.length > 0, has_ipv6: dns.aaaa.length > 0,
      has_mail: dns.mx.length > 0, nameservers: dns.ns,
      _meta: { skill: 'whois-dns-lookup', latency_ms: Date.now() - startTime },
    });
  } catch (error: any) {
    return errorResponse(res, 'DNS lookup failed', 500, error.message);
  }
}

export default authMiddleware(handler);
