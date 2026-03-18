import type { CodePattern } from './types'

/**
 * Pre-compiled regex rule registry for static code analysis.
 * All RegExp objects are compiled at module load time (Requirement 6.7, 12.4).
 * 8 rules covering: dynamic execution, shell injection, env leaks, data exfiltration,
 * hardcoded credentials, unsafe imports, filesystem overreach, insecure network.
 */
export const RULES: CodePattern[] = [
  {
    rule_id: 'EXEC_EVAL',
    name: 'Dynamic code execution',
    pattern: /\beval\s*\(|new\s+Function\s*\(|vm\.runInContext\s*\(/,
    severity: 'critical',
    description: 'Dynamic code execution detected — eval(), new Function(), or vm.runInContext can execute arbitrary code',
    permission_mapping: 'Bash(*)',
  },
  {
    rule_id: 'SHELL_INJECT',
    name: 'Shell injection',
    pattern: /child_process\.exec\b|child_process\.execSync\b|\bexecSync\s*\(|\bexec\s*\(\s*`/,
    severity: 'critical',
    description: 'Shell command execution detected — risk of injection attacks via child_process',
    permission_mapping: 'Bash(*)',
  },
  {
    rule_id: 'ENV_LEAK',
    name: 'Environment variable leak',
    pattern: /process\.env\.\w+/,
    severity: 'high',
    description: 'Environment variable access detected — may leak secrets if included in responses',
  },
  {
    rule_id: 'DATA_EXFIL',
    name: 'Data exfiltration',
    pattern: /\bfetch\s*\(\s*['"`]https?:\/\/|axios\.(post|put|patch)\s*\(/,
    severity: 'high',
    description: 'Outbound HTTP request detected — potential data exfiltration to external domains',
    permission_mapping: 'Network',
  },
  {
    rule_id: 'HARDCODED_CRED',
    name: 'Hardcoded credentials',
    pattern: /(api[_-]?key|api[_-]?secret|token|password|secret[_-]?key)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{8,}['"]/i,
    severity: 'high',
    description: 'Hardcoded credential detected — API keys, tokens, or passwords should not be in source code',
  },
  {
    rule_id: 'UNSAFE_IMPORT',
    name: 'Unsafe remote import',
    pattern: /require\s*\(\s*['"]https?:\/\/|import\s+.*from\s+['"]https?:\/\//,
    severity: 'medium',
    description: 'Import from HTTP URL detected — loading code from remote URLs is a supply chain risk',
  },
  {
    rule_id: 'FS_OVERREACH',
    name: 'Filesystem overreach',
    pattern: /['"`]\/etc\/|['"`]~\/\.ssh|['"`]~\/\.aws|['"`]\/root\//,
    severity: 'medium',
    description: 'Sensitive filesystem path access detected — reading/writing to /etc, ~/.ssh, or ~/.aws',
    permission_mapping: 'Bash(*)',
  },
  {
    rule_id: 'INSECURE_NET',
    name: 'Insecure network request',
    pattern: /\bfetch\s*\(\s*['"`]http:\/\/|\.get\s*\(\s*['"`]http:\/\/|\.post\s*\(\s*['"`]http:\/\//,
    severity: 'low',
    description: 'Non-HTTPS URL detected in network request — data transmitted without encryption',
    permission_mapping: 'Network',
  },
]
