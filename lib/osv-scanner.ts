// OSV.dev Security Scanner for Skill Dependencies
// Fetches dependency files from GitHub repos and queries OSV for known vulnerabilities
// Adapted from app/src/lib/osv-scanner.ts for the skills backend

export interface OsvVulnerability {
  id: string
  summary?: string
  severity?: string
  modified: string
}

export interface PackageQuery {
  name: string
  version: string
  ecosystem: string
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.raw' }
  if (GITHUB_TOKEN) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  return h
}

/**
 * Extract owner/repo from a GitHub URL
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

/**
 * Fetch package.json from a GitHub repo and parse dependencies
 */
export async function fetchNpmDependencies(owner: string, repo: string): Promise<PackageQuery[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { headers: githubHeaders(), signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return []

    const content = await res.text()
    let pkg: Record<string, unknown>
    try {
      pkg = JSON.parse(content)
    } catch {
      return [] // Not valid JSON (e.g. GitHub error page or binary)
    }

    const queries: PackageQuery[] = []

    for (const depType of ['dependencies', 'devDependencies']) {
      const deps = pkg[depType]
      if (!deps || typeof deps !== 'object') continue
      for (const [name, versionRaw] of Object.entries(deps as Record<string, unknown>)) {
        if (typeof versionRaw !== 'string') continue
        // Strip semver prefixes like ^, ~, >=
        const version = versionRaw.replace(/^[\^~>=<]+/, '')
        if (version && !version.includes('*') && !version.includes('x')) {
          queries.push({ name, version, ecosystem: 'npm' })
        }
      }
    }
    return queries
  } catch {
    return []
  }
}

/**
 * Fetch requirements.txt from a GitHub repo and parse Python dependencies
 */
export async function fetchPythonDependencies(owner: string, repo: string): Promise<PackageQuery[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/requirements.txt`,
      { headers: githubHeaders(), signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return []

    const content = await res.text()
    const queries: PackageQuery[] = []

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue
      const match = trimmed.match(/^([a-zA-Z0-9_.-]+)==([^\s;]+)/)
      if (match) {
        queries.push({ name: match[1], version: match[2], ecosystem: 'PyPI' })
      }
    }
    return queries
  } catch {
    return []
  }
}

/**
 * Query OSV.dev batch API for vulnerabilities
 */
export async function queryOsv(packages: PackageQuery[]): Promise<OsvVulnerability[]> {
  if (packages.length === 0) return []

  const queries = packages.map(p => ({
    package: { name: p.name, ecosystem: p.ecosystem },
    version: p.version,
  }))

  const res = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
    signal: AbortSignal.timeout(15_000), // 15s timeout
  })

  if (!res.ok) {
    throw new Error(`OSV API error: ${res.status}`)
  }

  const data = await res.json()
  const vulns: OsvVulnerability[] = []
  const seen = new Set<string>()

  for (const result of data.results || []) {
    for (const v of result.vulns || []) {
      if (!seen.has(v.id)) {
        seen.add(v.id)
        vulns.push({
          id: v.id,
          summary: v.summary,
          severity: v.severity,
          modified: v.modified,
        })
      }
    }
  }

  return vulns
}
