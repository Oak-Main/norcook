/**
 * Verifies a handoff archive against its manifest.
 *
 *   node scripts/verify-handoff.mjs [archive.zip]
 *
 * Unpacks into a temporary directory, re-hashes every file listed in the
 * manifest, and confirms the archive contains none of the excluded paths. This
 * exists so the checksum in the handoff is a verified claim rather than an
 * unchecked number: a manifest that was never validated is not evidence.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const archive = process.argv[2]
if (!archive) {
  console.error('usage: node scripts/verify-handoff.mjs <archive.zip>')
  process.exit(2)
}

const sha256File = `${archive}.sha256`
const manifestPath = archive.replace(/\.zip$/, '.manifest.txt')

const dir = await mkdtemp(path.join(tmpdir(), 'norcook-handoff-'))
let failures = 0
const fail = (message) => {
  console.error(`FAIL  ${message}`)
  failures += 1
}

try {
  // Archive digest must match the published checksum file.
  const buffer = await readFile(archive)
  const digest = createHash('sha256').update(buffer).digest('hex')
  const expected = (await readFile(sha256File, 'utf8')).trim().split(/\s+/)[0]
  if (digest !== expected) fail(`archive sha256 mismatch: ${digest} != ${expected}`)
  else console.log(`ok    archive sha256 ${digest}`)

  execFileSync('tar', ['-xf', archive, '-C', dir], { stdio: 'inherit' })

  const manifest = await readFile(manifestPath, 'utf8')
  const entries = [...manifest.matchAll(/^([0-9a-f]{64})\s{2}(.+)$/gm)].map((m) => ({
    sha256: m[1],
    file: m[2].trim(),
  }))

  if (entries.length === 0) fail('manifest lists no files')

  let checked = 0
  for (const entry of entries) {
    let content
    try {
      content = await readFile(path.join(dir, entry.file))
    } catch {
      fail(`missing from archive: ${entry.file}`)
      continue
    }
    const actual = createHash('sha256').update(content).digest('hex')
    if (actual !== entry.sha256) fail(`content mismatch: ${entry.file}`)
    else checked += 1
  }
  console.log(`ok    ${checked}/${entries.length} files match their manifest hash`)

  // Nothing that was meant to be excluded may be present.
  const FORBIDDEN = [/^node_modules\//, /^\.next\//, /^\.git\//, /^\.env/, /^review\//, /^test-results\//, /^playwright-report\//]
  const walk = async (base, prefix = '') => {
    for (const item of await readdir(base, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${item.name}` : item.name
      if (FORBIDDEN.some((re) => re.test(rel))) fail(`forbidden path in archive: ${rel}`)
      if (item.isDirectory()) await walk(path.join(base, item.name), rel)
    }
  }
  await walk(dir)
  console.log('ok    no node_modules, .next, .git, .env, review/ or test output present')
} finally {
  await rm(dir, { recursive: true, force: true })
}

if (failures) {
  console.error(`\n${failures} problem(s) found.`)
  process.exit(1)
}
console.log('\nArchive verified.')