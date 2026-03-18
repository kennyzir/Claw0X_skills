import type { PackageQuery, OsvVulnerability } from '../../lib/osv-scanner'
import { queryOsv } from '../../lib/osv-scanner'
import type { DependencyScanResult } from './types'

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
}

const SCORE_CAP = 50
const VULN_CAP = 20

/**
 * Map an OSV severity string to our normalized severity level.
 * OSV severity can be CVSS-style strings or simple labels.
 */
function classifySeverity(severity: string | undefined): 'critical' | 'high' | 'medium' | 'low' {
  if (!severity) return 'medium' // default when severity is unknown

  const lower = severity.toLowerCase()
  if (lower.includes('critical')) return 'critical'
  if (lower.includes('high')) return 'high'
  if (lower.includes('medium') || lower.includes('moderate')) return 'medium'
  if (lower.includes('low')) return 'low'

  // Try to parse CVSS score if it's a number
  const score = parseFloat(lower)
  if (!isNaN(score)) {
    if (score >= 9.0) return 'critical'
    if (score >= 7.0) return 'high'
    if (score >= 4.0) return 'medium'
    return 'low'
  }

  return 'medium'
}

/**
 * Scan dependencies for known CVEs via OSV.dev batch API.
 * Classifies vulnerabilities by severity and computes a capped score (0–50).
 * Handles OSV API failure gracefully — returns 0 packages scanned on error.
 */
export async function scanDependencies(
  packages: PackageQuery[]
): Promise<DependencyScanResult> {
  if (packages.length === 0) {
    return {
      packages_scanned: 0,
      vulnerabilities: [],
      vulnerability_counts: { critical: 0, high: 0, medium: 0, low: 0 },
      score_contribution: 0,
    }
  }

  let vulns: OsvVulnerability[]
  try {
    vulns = await queryOsv(packages)
  } catch {
    // OSV API failure — graceful degradation (Requirement 10.2)
    return {
      packages_scanned: 0,
      vulnerabilities: [],
      vulnerability_counts: { critical: 0, high: 0, medium: 0, low: 0 },
      score_contribution: 0,
    }
  }

  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let rawScore = 0

  for (const v of vulns) {
    const sev = classifySeverity(v.severity)
    counts[sev]++
    rawScore += SEVERITY_WEIGHTS[sev]
  }

  // Cap stored vulnerabilities at 20 entries
  const capped = vulns.slice(0, VULN_CAP)

  return {
    packages_scanned: packages.length,
    vulnerabilities: capped,
    vulnerability_counts: counts,
    score_contribution: Math.min(rawScore, SCORE_CAP),
  }
}
