import type { ScanInput, ResolvedScanTargets, SourceFile, PackageQuery } from './types'
import { parseGitHubUrl, fetchNpmDependencies, fetchPythonDependencies } from '../../lib/osv-scanner'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const CLAW0X_API_BASE = process.env.CLAW0X_API_BASE || 'https://claw0x.com'

/** Max source files to scan (Requirement 2.3, 12.3) */
const MAX_SOURCE_FILES = 20

/** Allowed source file extensions */
const SOURCE_EXTENSIONS = ['.ts', '.js', '.py']

/** Timeout budget for GitHub fetches (ms) — leaves headroom within Vercel 10s limit */
const GITHUB_TIMEOUT_MS = 7_000

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.raw' }
  if (GITHUB_TOKEN) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  return h
}

/**
 * Validate that exactly one input mode is provided.
 * Returns the mode name or throws with a 400-style message.
 */
function validateInputMode(input: ScanInput): 'repo_url' | 'skill_slug' | 'direct' {
  const modes: Array<{ key: keyof ScanInput; mode: 'repo_url' | 'skill_slug' | 'direct' }> = [
    { key: 'repo_url', mode: 'repo_url' },
    { key: 'skill_slug', mode: 'skill_slug' },
    { key: 'code', mode: 'direct' },
  ]

  const present = modes.filter(m => {
    const val = input[m.key]
    return val !== undefined && val !== null && val !== ''
  })

  if (present.length === 0) {
    const err = new Error('Exactly one of repo_url, skill_slug, or code must be provided')
    ;(err as any).statusCode = 400
    throw err
  }

  if (present.length > 1) {
    const err = new Error(
      'Input fields are mutually exclusive: provide exactly one of repo_url, skill_slug, or code'
    )
    ;(err as any).statusCode = 400
    throw err
  }

  return present[0].mode
}

/**
 * Fetch the repo tree and return source file paths (top 20 .ts/.js/.py files).
 */
async function fetchSourceFilePaths(
  owner: string,
  repo: string,
  branch = 'main'
): Promise<string[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const res = await fetch(url, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  })

  if (!res.ok) {
    // Try 'master' branch as fallback
    if (branch === 'main') {
      return fetchSourceFilePaths(owner, repo, 'master')
    }
    return []
  }

  const data: any = await res.json()
  const tree: Array<{ path: string; type: string; size?: number }> = data.tree || []

  // Filter to source files only, skip node_modules / dist / .git
  const sourceFiles = tree.filter(entry => {
    if (entry.type !== 'blob') return false
    const ext = entry.path.substring(entry.path.lastIndexOf('.'))
    if (!SOURCE_EXTENSIONS.includes(ext)) return false
    if (
      entry.path.includes('node_modules/') ||
      entry.path.includes('dist/') ||
      entry.path.includes('.git/') ||
      entry.path.includes('.next/')
    ) {
      return false
    }
    return true
  })

  // Take top 20 by relevance (smaller files first — more likely to be actual skill code)
  sourceFiles.sort((a, b) => (a.size || 0) - (b.size || 0))
  return sourceFiles.slice(0, MAX_SOURCE_FILES).map(f => f.path)
}

/**
 * Fetch the raw content of a single file from a GitHub repo.
 */
async function fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(url, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/**
 * Fetch source files, dependencies, and SKILL.md from a GitHub repo in parallel.
 */
async function resolveFromGitHub(
  repoUrl: string
): Promise<ResolvedScanTargets> {
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) {
    const err = new Error('Invalid GitHub URL — expected https://github.com/{owner}/{repo}')
    ;(err as any).statusCode = 400
    throw err
  }

  const { owner, repo } = parsed

  // Phase 1: fetch tree + dependencies + SKILL.md in parallel
  const [filePaths, npmDeps, pyDeps, skillMd] = await Promise.all([
    fetchSourceFilePaths(owner, repo),
    fetchNpmDependencies(owner, repo),
    fetchPythonDependencies(owner, repo),
    fetchFileContent(owner, repo, 'SKILL.md'),
  ])

  // Phase 2: fetch source file contents in parallel
  const fileContents = await Promise.all(
    filePaths.map(async (path): Promise<SourceFile | null> => {
      const content = await fetchFileContent(owner, repo, path)
      if (!content) return null
      return { path, content }
    })
  )

  const source_files = fileContents.filter((f): f is SourceFile => f !== null)
  const dependencies = [...npmDeps, ...pyDeps]

  return {
    source_files,
    dependencies,
    skill_md_content: skillMd,
    input_mode: 'repo_url',
    repo_url: repoUrl,
  }
}

/**
 * Resolve a skill slug to a repo URL via the Claw0x API, then fetch from GitHub.
 */
async function resolveFromSlug(slug: string): Promise<ResolvedScanTargets> {
  const url = `${CLAW0X_API_BASE}/api/skills?slug=${encodeURIComponent(slug)}`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!res.ok) {
    const err = new Error('Skill not found')
    ;(err as any).statusCode = 404
    throw err
  }

  const data = await res.json()

  // The API may return an array or a single object
  const skill = Array.isArray(data) ? data[0] : data
  if (!skill) {
    const err = new Error('Skill not found')
    ;(err as any).statusCode = 404
    throw err
  }

  const repoUrl: string | undefined = typeof skill.repo_url === 'string'
    ? skill.repo_url
    : typeof skill.github_url === 'string'
      ? skill.github_url
      : undefined
  if (!repoUrl) {
    // Skill exists but has no repo — return empty scan targets
    return {
      source_files: [],
      dependencies: [],
      skill_md_content: null,
      input_mode: 'skill_slug',
      repo_url: null,
    }
  }

  // Follow the repo_url flow
  const result = await resolveFromGitHub(repoUrl)
  return {
    ...result,
    input_mode: 'skill_slug',
  }
}

/**
 * Wrap direct code submission into ResolvedScanTargets.
 */
function resolveFromCode(input: ScanInput): ResolvedScanTargets {
  const dependencies: PackageQuery[] = []

  // Parse dependencies object into PackageQuery[] for npm ecosystem
  if (input.dependencies && typeof input.dependencies === 'object') {
    for (const [name, versionRaw] of Object.entries(input.dependencies)) {
      if (typeof versionRaw !== 'string') continue
      const version = versionRaw.replace(/^[\^~>=<]+/, '')
      if (version && !version.includes('*') && !version.includes('x')) {
        dependencies.push({ name, version, ecosystem: 'npm' })
      }
    }
  }

  return {
    source_files: [{ path: 'input.ts', content: input.code! }],
    dependencies,
    skill_md_content: input.skill_md || null,
    input_mode: 'direct',
    repo_url: null,
  }
}

/**
 * Main entry point: resolve any ScanInput into normalized scan targets.
 *
 * Validates mutual exclusivity, dispatches to the correct resolution path,
 * and enforces timeout budgets within the Vercel 10s limit.
 */
export async function resolveInput(input: ScanInput): Promise<ResolvedScanTargets> {
  const mode = validateInputMode(input)

  switch (mode) {
    case 'repo_url': {
      // Validate GitHub URL pattern
      const ghPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+/
      if (!ghPattern.test(input.repo_url!)) {
        const err = new Error('Invalid GitHub URL — expected https://github.com/{owner}/{repo}')
        ;(err as any).statusCode = 400
        throw err
      }
      return resolveFromGitHub(input.repo_url!)
    }

    case 'skill_slug': {
      // Validate slug length (1-100 chars)
      const slug = input.skill_slug!
      if (slug.length < 1 || slug.length > 100) {
        const err = new Error('skill_slug must be between 1 and 100 characters')
        ;(err as any).statusCode = 400
        throw err
      }
      return resolveFromSlug(slug)
    }

    case 'direct': {
      // Validate code size (max 500KB)
      const code = input.code!
      if (code.length > 500 * 1024) {
        const err = new Error('code must not exceed 500KB')
        ;(err as any).statusCode = 400
        throw err
      }
      return resolveFromCode(input)
    }
  }
}
