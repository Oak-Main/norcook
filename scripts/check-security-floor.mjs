// Fails if the INSTALLED next or sharp is below the advisory floor.
// Advisories: GHSA-2464-fhr4-w9xw (Image Optimization API SVG RCE), GHSA-p3m5-59mp-jv5r (Server Actions DoS),
// GHSA-673q-mjm6-r5xr (`use cache` typed arrays RCE). Read-only: no network, no build, no server.
// sharp is resolved FROM next's own location, so this checks the copy the framework actually loads.
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const floors = { next: '16.4.1', sharp: '0.35.5' }

function parse(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(version))
  if (!match) throw new Error(`Cannot parse version "${version}"`)
  return { core: match.slice(1, 4).map(Number), pre: match[4] ?? null }
}

// Pre-releases of the floor version (for example 16.4.1-canary.3) sort below it.
function isBelow(version, floor) {
  const a = parse(version)
  const b = parse(floor)
  for (let i = 0; i < 3; i += 1) {
    if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i]
  }
  return a.pre !== null && b.pre === null
}

const readManifest = (file) => JSON.parse(readFileSync(file, 'utf8'))

// sharp does not export ./package.json, so walk up from its resolved entry point to find its manifest.
function findPackageRoot(entry, name) {
  let dir = path.dirname(entry)
  for (;;) {
    const manifest = path.join(dir, 'package.json')
    if (existsSync(manifest) && readManifest(manifest).name === name) return manifest
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error(`Could not locate package.json for "${name}" above ${entry}`)
    dir = parent
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const report = []

function check(name, locate) {
  let manifestPath
  try {
    manifestPath = locate()
  } catch (error) {
    failures.push(`${name}: not resolvable (${error.code ?? error.message}). Run the repo's frozen-lockfile install first.`)
    return null
  }
  const { version } = readManifest(manifestPath)
  const ok = !isBelow(version, floors[name])
  report.push(`${ok ? 'ok  ' : 'FAIL'} ${name}@${version} (floor >=${floors[name]})`)
  if (!ok) failures.push(`${name}@${version} is below the security floor >=${floors[name]}`)
  return manifestPath
}

const nextManifest = check('next', () => createRequire(path.join(root, 'package.json')).resolve('next/package.json'))
if (nextManifest) {
  const fromNext = createRequire(nextManifest)
  check('sharp', () => findPackageRoot(fromNext.resolve('sharp'), 'sharp'))
} else {
  failures.push('sharp: skipped because next could not be resolved')
}

for (const line of report) console.log(line)
if (failures.length) {
  console.error(`\nSecurity floor check FAILED:\n${failures.map((f) => `  - ${f}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Security floor check passed.')
}
