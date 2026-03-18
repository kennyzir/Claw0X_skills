import type { CodeScanResult, CodeFinding, SourceFile } from './types'
import { RULES } from './rules'

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 20,
  high: 12,
  medium: 5,
  low: 2,
}

const SCORE_CAP = 40
const FINDINGS_CAP = 50

/**
 * Scan source files line-by-line against all 8 regex rules.
 * Returns findings, counts, and a capped score contribution (0–40).
 */
export function analyzeCode(files: SourceFile[]): CodeScanResult {
  const findings: CodeFinding[] = []
  const finding_counts = { critical: 0, high: 0, medium: 0, low: 0 }
  let rawScore = 0

  for (const file of files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          // Reset lastIndex for stateless matching on next call
          rule.pattern.lastIndex = 0

          finding_counts[rule.severity]++
          rawScore += SEVERITY_WEIGHTS[rule.severity] ?? 0

          if (findings.length < FINDINGS_CAP) {
            const match = line.trim()
            findings.push({
              rule_id: rule.rule_id,
              name: rule.name,
              severity: rule.severity,
              file: file.path,
              line: i + 1,
              match: match.length > 100 ? match.slice(0, 100) : match,
              description: rule.description,
            })
          }
        }
      }
    }
  }

  return {
    findings,
    finding_counts,
    rules_checked: RULES.length,
    score_contribution: Math.min(rawScore, SCORE_CAP),
  }
}
