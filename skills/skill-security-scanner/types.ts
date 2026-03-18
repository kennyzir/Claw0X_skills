import type { PackageQuery, OsvVulnerability } from '../../lib/osv-scanner'

// --- Input Types ---

export interface ScanInput {
  repo_url?: string
  skill_slug?: string
  code?: string
  dependencies?: Record<string, string>
  skill_md?: string
}

export interface SourceFile {
  path: string
  content: string
}

export interface ResolvedScanTargets {
  source_files: SourceFile[]
  dependencies: PackageQuery[]
  skill_md_content: string | null
  input_mode: 'repo_url' | 'skill_slug' | 'direct'
  repo_url: string | null
}

// --- Static Analysis Types ---

export interface CodePattern {
  rule_id: string
  name: string
  pattern: RegExp
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  permission_mapping?: string
}

export interface CodeFinding {
  rule_id: string
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  match: string
  description: string
}

export interface CodeScanResult {
  findings: CodeFinding[]
  finding_counts: {
    critical: number
    high: number
    medium: number
    low: number
  }
  rules_checked: number
  score_contribution: number
}

// --- Dependency Scan Types ---

export interface DependencyScanResult {
  packages_scanned: number
  vulnerabilities: OsvVulnerability[]
  vulnerability_counts: {
    critical: number
    high: number
    medium: number
    low: number
  }
  score_contribution: number
}

// --- Permission Audit Types ---

export interface PermissionAuditResult {
  declared_permissions: string[]
  detected_permissions: string[]
  undeclared_risks: string[]
  score_contribution: number
}

// --- Risk Score Types ---

export interface RiskScore {
  dependency_score: number
  code_score: number
  permission_score: number
  total_score: number
  overall_risk: 'low' | 'medium' | 'high'
}

// --- Report Types ---

export interface SecurityReport {
  overall_risk: 'low' | 'medium' | 'high'
  risk_score: number
  input_mode: 'repo_url' | 'skill_slug' | 'direct'
  repo_url: string | null
  dependency_scan: DependencyScanResult
  code_scan: CodeScanResult
  permission_audit: PermissionAuditResult
  recommendations: string[]
  scanned_at: string
  scan_duration_ms: number
}

// Re-export OSV types for convenience
export type { PackageQuery, OsvVulnerability }
