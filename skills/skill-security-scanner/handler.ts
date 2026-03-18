import { VercelRequest, VercelResponse } from '@vercel/node'
import { authMiddleware } from '../../lib/auth'
import { successResponse, errorResponse } from '../../lib/response'
import { resolveInput } from './input-resolver'
import { scanDependencies } from './dependency-scanner'
import { analyzeCode } from './code-analyzer'
import { auditPermissions } from './permission-auditor'
import { computeRiskScore } from './risk-scorer'
import { buildReport } from './report-builder'
import type { ScanInput, DependencyScanResult, CodeScanResult } from './types'

async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now()
  const input: ScanInput = req.body || {}

  // Validate at least one input mode is present
  if (!input.repo_url && !input.skill_slug && !input.code) {
    return errorResponse(
      res,
      'Exactly one of repo_url, skill_slug, or code must be provided',
      400
    )
  }

  try {
    // Step 1: Resolve input to normalized scan targets
    const targets = await resolveInput(input)

    // Step 2: Run scan layers in parallel with per-layer isolation
    const [depScan, codeScan] = await Promise.all([
      scanDependencies(targets.dependencies).catch((): DependencyScanResult => ({
        packages_scanned: 0,
        vulnerabilities: [],
        vulnerability_counts: { critical: 0, high: 0, medium: 0, low: 0 },
        score_contribution: 0,
      })),
      Promise.resolve().then(() => {
        try {
          return analyzeCode(targets.source_files)
        } catch {
          return {
            findings: [],
            finding_counts: { critical: 0, high: 0, medium: 0, low: 0 },
            rules_checked: 0,
            score_contribution: 0,
          } as CodeScanResult
        }
      }),
    ])

    // Step 3: Permission audit (depends on code findings)
    let permAudit
    try {
      permAudit = auditPermissions(targets.skill_md_content, codeScan.findings)
    } catch {
      permAudit = {
        declared_permissions: [] as string[],
        detected_permissions: [] as string[],
        undeclared_risks: [] as string[],
        score_contribution: 0,
      }
    }

    // Step 4: Compute risk score
    const riskScore = computeRiskScore(
      depScan.score_contribution,
      codeScan.score_contribution,
      permAudit.score_contribution
    )

    // Step 5: Build final report
    const report = buildReport({
      depScan,
      codeScan,
      permAudit,
      riskScore,
      inputMode: targets.input_mode,
      repoUrl: targets.repo_url,
      startTime,
    })

    return successResponse(res, report)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode < 500
      ? error.message
      : 'Security scan failed'

    if (statusCode >= 500) {
      console.error('Security scanner error:', error)
    }

    return errorResponse(res, message, statusCode, statusCode < 500 ? undefined : error.message)
  }
}

export default authMiddleware(handler)
