/**
 * Builds the pilot handoff: a sanitised source archive plus a checksum manifest.
 *
 *   node scripts/build-handoff.mjs
 *
 * Produces, in the repository root:
 *   norcook-cook-companion-pilot-<short-sha>.zip
 *   norcook-cook-companion-pilot-<short-sha>.zip.sha256
 *   norcook-cook-companion-pilot-<short-sha>.manifest.txt
 *
 * Sanitisation rules — the archive must not carry anything that would be a
 * secret, a credential, or build output someone could mistake for source:
 *
 *   excluded   node_modules, .next, .git, .env*, review/ (regenerable evidence),
 *              test-results, playwright-report, *.tsbuildinfo, server.log/err
 *   scrubbed   tracked text files are scanned for credential-shaped patterns; a
 *              hit fails the build loudly rather than shipping silently
 *
 * The archive is built from `git ls-files`, so it can only ever contain files
 * that are actually tracked. Anything uncommitted cannot leak in by accident.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const short = sha.slice(0, 8)
const base = `norcook-cook-companion-pilot-${short}`
const zipPath = `${base}.zip`

/** Files git tracks but that must never ship in a handoff. */
const EXCLUDE = [
  /^review\//,
  /(^|\/)server\.(log|err)$/,
  /(^|\/)COMMIT_MSG\.tmp$/,
  /\.tsbuildinfo$/,
  /\.env/i,
]

/** Credential shapes worth failing on. Tuned for false-positive tolerance. */
const SECRET_PATTERNS = [
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'bearer assignment', re: /\bBearer\s+[A-Za-z0-9._\-]{24,}\b/ },
]

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.avif', '.gif',
  '.zip', '.pdf', '.woff', '.woff2', '.ttf', '.eot',
])

const files = git('ls-files', '-z')
  .split('\0')
  .filter(Boolean)
  .filter((file) => !EXCLUDE.some((re) => re.test(file)))

// --- secret scan ------------------------------------------------------------
const findings = []
for (const file of files) {
  if (BINARY_EXT.has(path.extname(file).toLowerCase())) continue
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch {
    continue
  }
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(text)) findings.push({ file, name })
  }
}

if (findings.length) {
  console.error('Refusing to build the handoff. Credential-shaped matches:')
  for (const f of findings) console.error(`  ${f.file} — ${f.name}`)
  process.exit(1)
}

// --- zip --------------------------------------------------------------------
// Written by hand (store-only, no compression) to avoid a zip dependency; the
// payload is source text and is small enough that compression is not required.
const chunks = []
const central = []
let offset = 0

function dosStamp(date) {
  const d = new Date(date)
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  const day =
    ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, day }
}

for (const file of files) {
  const buffer = await readFile(file)
  const nameBuffer = Buffer.from(file, 'utf8')
  const crc = crc32(buffer)
  const { time, day } = dosStamp('2026-10-22T00:00:00Z')

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4) // version needed
  local.writeUInt16LE(0x0800, 6) // UTF-8 names
  local.writeUInt16LE(0, 8) // store
  local.writeUInt16LE(time, 10)
  local.writeUInt16LE(day, 12)
  local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(buffer.length, 18)
  local.writeUInt32LE(buffer.length, 22)
  local.writeUInt16LE(nameBuffer.length, 26)
  local.writeUInt16LE(0, 28)
  chunks.push(local, nameBuffer, buffer)

  const centralHeader = Buffer.alloc(46)
  centralHeader.writeUInt32LE(0x02014b50, 0)
  centralHeader.writeUInt16LE(20, 4)
  centralHeader.writeUInt16LE(20, 6)
  centralHeader.writeUInt16LE(0x0800, 8)
  centralHeader.writeUInt16LE(0, 10)
  centralHeader.writeUInt16LE(time, 12)
  centralHeader.writeUInt16LE(day, 14)
  centralHeader.writeUInt32LE(crc, 16)
  centralHeader.writeUInt32LE(buffer.length, 20)
  centralHeader.writeUInt32LE(buffer.length, 24)
  centralHeader.writeUInt16LE(nameBuffer.length, 28)
  centralHeader.writeUInt16LE(0, 30)
  centralHeader.writeUInt16LE(0, 32)
  centralHeader.writeUInt16LE(0, 34)
  centralHeader.writeUInt16LE(0, 36)
  centralHeader.writeUInt32LE(0, 38)
  centralHeader.writeUInt32LE(offset, 42)
  central.push(centralHeader, nameBuffer)

  offset += local.length + nameBuffer.length + buffer.length
}

const centralBuffer = Buffer.concat(central)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(0, 4)
end.writeUInt16LE(0, 6)
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(centralBuffer.length, 12)
end.writeUInt32LE(offset, 16)
end.writeUInt16LE(0, 20)

await new Promise((resolve, reject) => {
  const out = createWriteStream(zipPath)
  out.on('error', reject)
  out.on('finish', resolve)
  for (const chunk of chunks) out.write(chunk)
  out.write(centralBuffer)
  out.end(end)
})

function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n += 1) {
      c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = -1
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

// --- checksums and manifest -------------------------------------------------
const zipBuffer = await readFile(zipPath)
const zipSha = createHash('sha256').update(zipBuffer).digest('hex')

const perFile = []
for (const file of files.sort()) {
  const buffer = await readFile(file)
  perFile.push({
    file,
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  })
}

await writeFile(`${zipPath}.sha256`, `${zipSha}  ${path.basename(zipPath)}\n`)

const manifest = [
  '# Norcook cook companion pilot — handoff manifest',
  '',
  `archive            ${zipPath}`,
  `archive sha256     ${zipSha}`,
  `commit             ${sha}`,
  `branch             ${git('rev-parse', '--abbrev-ref', 'HEAD').trim()}`,
  `base commit        ${git('merge-base', 'HEAD', 'main').trim()} (origin/main)`,
  `files in archive   ${files.length}`,
  '',
  '## Provenance',
  '',
  'Built from `git ls-files`, so only tracked files can be included.',
  'Excluded: node_modules, .next, .git, .env*, review/, test-results,',
  'playwright-report, *.tsbuildinfo, server.log/server.err.',
  `Credential scan: ${SECRET_PATTERNS.length} patterns over ${files.length} text files, 0 matches.`,
  '',
  '## Per-file sha256',
  '',
  '```',
  ...perFile.map((f) => `${f.sha256}  ${f.file}`),
  '```',
  '',
].join('\n')

await writeFile(`${base}.manifest.txt`, manifest)

const size = (await stat(zipPath)).size
console.log(`archive   ${zipPath}`)
console.log(`bytes     ${size}`)
console.log(`sha256    ${zipSha}`)
console.log(`files     ${files.length}`)
console.log(`manifest  ${base}.manifest.txt`)