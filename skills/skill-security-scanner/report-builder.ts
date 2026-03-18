import type {
  SecurityReport,
  DependencyScanResult,
  CodeScanResult,
  PermissionAuditResult,
  RiskScore,
} from './types'

interface BuildReportParams {
  depScan: DependencyScanResult
  codeScan: CodeScanResult
  permAudit: PermissionAuditResult
  riskScore: RiskScore
  inputMode: 'repo_url' | 'skill_slug' | 'direct'
  repoUrl: string | null
  startTime: number
}

/**
 * Assemble the final SecurityReport from all scan layer results.
 * Generates actionable recommendations based on findings.
 */
export function buildReport(params: BuildReportParams): SecurityReport {
  const { depScan, codeScan, permAudit, riskScore, inputMode, repoUrl, startTime } = params

  const recommendations: string[] = []

  // Recommendations from critical/high code findings
  for (const finding of codeScan.findings) {
    if (finding.severity === 'critical' || finding.severity === 'high') {
      const label = finding.severity === 'critical' ? 'Critical' : 'High'
      recommendations.push(`${label}: ${finding.name} — ${finding.description}`)
    }
  }

  // Recommendations from critical/high dependency vulnerabilities
  for (const vuln of depScan.vulnerabilities) {
    const sev = vuln.severity?.toLowerCase() ?? ''
    if (sev.includes('critical') || sev.includes('high')) {
      recommendations.push(`Upgrade package to fix ${vuln.id}`)
    }
  }

  // Recommendations for undeclared permissions
  for (const perm of permAudit.undeclared_risks) {
    recommendations.push(`Undeclared permission: ${perm} detected but not declared in SKILL.md`)
  }

  return {
    overall_risk: riskScore.overall_risk,
    risk_score: riskScore.total_score,
    input_mode: inputMode,
    repo_url: repoUrl,
    dependency_scan: depScan,
    code_scan: codeScan,
    permission_audit: permAudit,
    recommendations,
    scanned_at: new Date().toISOString(),
    scan_duration_ms: Date.now() - startTime,
  }
}
