import type { PermissionAuditResult, CodeFinding } from './types'

const PERMISSION_SCORE_PER_UNDECLARED = 5
const SCORE_CAP = 10

/**
 * Parse SKILL.md YAML frontmatter to extract `allowed-tools` as an array of strings.
 * Uses simple regex — no js-yaml dependency needed.
 */
function parseDeclaredPermissions(skillMdContent: string): string[] {
  // Extract YAML frontmatter between --- delimiters
  const fmMatch = skillMdContent.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) return []

  const frontmatter = fmMatch[1]

  // Find allowed-tools block (YAML list)
  const toolsMatch = frontmatter.match(/allowed-tools:\s*\n((?:\s+-\s+.+\n?)*)/)
  if (!toolsMatch) return []

  const items: string[] = []
  const listBlock = toolsMatch[1]
  for (const line of listBlock.split('\n')) {
    const itemMatch = line.match(/^\s+-\s+(.+)/)
    if (itemMatch) {
      items.push(itemMatch[1].trim())
    }
  }
  return items
}

/**
 * Map code findings to permission categories using the permission_mapping field from rules.
 * Returns a deduplicated set of detected permission strings.
 */
function detectPermissions(codeFindings: CodeFinding[]): string[] {
  // Import rules to get permission_mapping — but we receive CodeFinding which doesn't
  // carry permission_mapping. We need to look up the rule by rule_id.
  // Instead, we maintain a static mapping here matching the rule registry.
  const RULE_PERMISSION_MAP: Record<string, string> = {
    EXEC_EVAL: 'Bash(*)',
    SHELL_INJECT: 'Bash(*)',
    DATA_EXFIL: 'Network',
    FS_OVERREACH: 'Bash(*)',
    INSECURE_NET: 'Network',
  }

  const detected = new Set<string>()
  for (const finding of codeFindings) {
    const perm = RULE_PERMISSION_MAP[finding.rule_id]
    if (perm) {
      detected.add(perm)
    }
  }
  return Array.from(detected)
}

/**
 * Cross-reference SKILL.md declared permissions against code-detected permissions.
 * Score: +5 per undeclared permission, capped at 10.
 */
export function auditPermissions(
  skillMdContent: string | null,
  codeFindings: CodeFinding[]
): PermissionAuditResult {
  const declared_permissions = skillMdContent
    ? parseDeclaredPermissions(skillMdContent)
    : []

  const detected_permissions = detectPermissions(codeFindings)

  // Set difference: detected - declared
  const declaredSet = new Set(declared_permissions)
  const undeclared_risks = detected_permissions.filter(p => !declaredSet.has(p))

  const rawScore = undeclared_risks.length * PERMISSION_SCORE_PER_UNDECLARED
  const score_contribution = Math.min(rawScore, SCORE_CAP)

  return {
    declared_permissions,
    detected_permissions,
    undeclared_risks,
    score_contribution,
  }
}
