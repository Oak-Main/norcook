// Production smoke test. Assumes `next build` already ran. Starts `next start` on a free local port bound to
// 127.0.0.1, checks `/` and (when a public raster image exists) the image optimizer, then stops the server.
// Normal-behaviour checks only: no exploit payloads, no SVG input, and no traffic leaves 127.0.0.1.
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readdirSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const host = '127.0.0.1'
const readyTimeoutMs = 60_000
const requestTimeoutMs = 30_000
const rasterExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'])

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, host, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

// First public raster image in sorted order, skipping favicon/app-icon style files.
function findPublicImage() {
  const publicDir = path.join(root, 'public')
  if (!existsSync(publicDir)) return null
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (rasterExtensions.has(path.extname(entry.name).toLowerCase())) found.push(full)
    }
  }
  walk(publicDir)
  const urls = found
    .map((file) => `/${path.relative(publicDir, file).split(path.sep).join('/')}`)
    .filter((url) => !/favicon|apple-touch|icon/i.test(url))
    .sort()
  return urls[0] ?? null
}

function stop(child) {
  if (!child || child.exitCode !== null || child.pid === undefined) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const fetchWith = (url, headers = {}) =>
  fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(requestTimeoutMs) })

async function waitUntilReady(base, child) {
  const deadline = Date.now() + readyTimeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited early with code ${child.exitCode}`)
    try {
      const response = await fetchWith(`${base}/`)
      await response.arrayBuffer()
      if (response.status === 200) return
    } catch {
      // server not accepting connections yet
    }
    await sleep(500)
  }
  throw new Error(`server not ready within ${readyTimeoutMs / 1000}s`)
}

async function main() {
  if (!existsSync(path.join(root, '.next', 'BUILD_ID'))) {
    throw new Error('No production build found (.next/BUILD_ID). Run `next build` first.')
  }
  const nextBin = createRequire(path.join(root, 'package.json')).resolve('next/dist/bin/next')
  const port = await freePort()
  const base = `http://${host}:${port}`
  let logs = ''
  const child = spawn(process.execPath, [nextBin, 'start', '--hostname', host, '--port', String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      logs = (logs + chunk).slice(-8000)
    })
  }
  try {
    await waitUntilReady(base, child)
    console.log(`ready: ${base}`)

    const page = await fetchWith(`${base}/`)
    await page.arrayBuffer()
    const pageType = page.headers.get('content-type') ?? ''
    if (page.status !== 200 || !pageType.includes('text/html')) {
      throw new Error(`GET / expected 200 text/html, got ${page.status} ${pageType}`)
    }
    console.log(`ok   GET / -> ${page.status} ${pageType}`)

    const image = findPublicImage()
    if (!image) {
      console.log('skip image optimizer check: no public raster image found')
    } else {
      const url = `${base}/_next/image?url=${encodeURIComponent(image)}&w=640&q=75`
      const response = await fetchWith(url, { Accept: 'image/webp' })
      const bytes = (await response.arrayBuffer()).byteLength
      const type = response.headers.get('content-type') ?? ''
      if (response.status !== 200 || !type.startsWith('image/') || bytes === 0) {
        throw new Error(
          `GET /_next/image?url=${image} expected 200 image/* with a body, got ${response.status} ${type} (${bytes} bytes)`,
        )
      }
      console.log(`ok   GET /_next/image?url=${image}&w=640&q=75 -> ${response.status} ${type} (${bytes} bytes)`)
    }
    console.log('Production smoke test passed.')
  } catch (error) {
    console.error(`Production smoke test FAILED: ${error.message}`)
    if (logs) console.error(`--- last server output ---\n${logs}`)
    process.exitCode = 1
  } finally {
    stop(child)
  }
}

main().catch((error) => {
  console.error(`Production smoke test FAILED: ${error.message}`)
  process.exitCode = 1
})
