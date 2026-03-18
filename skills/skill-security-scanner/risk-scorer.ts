import type { RiskScore } from './types'

/**
 * Aggregate capped layer scores into a total risk score and risk level.
 * Dependency: 0–50, Code: 0–40, Permission: 0–10 → Total: 0–100.
 */
export function computeRiskScore(
  depScore: number,
  codeScore: number,
  permScore: number
): RiskScore {
  const dependency_score = Math.min(Math.max(depScore, 0), 50)
  const code_score = Math.min(Math.max(codeScore, 0), 40)
  const permission_score = Math.min(Math.max(permScore, 0), 10)
  const total_score = dependency_score + code_score + permission_score

  let overall_risk: 'low' | 'medium' | 'high'
  if (total_score <= 20) {
    overall_risk = 'low'
  } else if (total_score <= 50) {
    overall_risk = 'medium'
  } else {
    overall_risk = 'high'
  }

  return {
    dependency_score,
    code_score,
    permission_score,
    total_score,
    overall_risk,
  }
}
