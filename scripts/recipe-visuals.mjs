import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const origin = 'https://www.norcook.app'
const registry = JSON.parse(await readFile('lib/recipe-visuals.json', 'utf8'))
const expected = { skillingsboller: ['ingredient', 'preparation', 'process'], eplekake: ['ingredient', 'preparation', 'process', 'finished_dish'], gravlaks: ['hero', 'preparation', 'process', 'finished_dish'], kanelsnurrer: ['hero', 'ingredient', 'preparation', 'process', 'finished_dish'] }
assert.equal(registry.length, 16)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const assets = []
for (const [recipe, shots] of Object.entries(expected)) {
  assert.deepEqual(registry.filter(asset => asset.recipe === recipe).map(asset => asset.shot).sort(), [...shots].sort())
}
assert.equal(new Set(registry.map(asset => asset.file)).size, 16)
for (const asset of registry) {
  assert.equal(asset.route, `/recipes/${asset.recipe}`)
  assert.equal(asset.url, `/assets/img/${asset.file}`)
  assert.match(asset.file, /^norcook-[a-z-]+-20261030\.webp$/)
  assert.ok(asset.alt && asset.permission && asset.prompt && asset.source)
  assert.match(asset.caption, /AI-created illustration/)
  const bytes = await readFile(`public${asset.url}`)
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, asset.width)
  assert.equal(metadata.height, asset.height)
  assert.equal(bytes.length, asset.bytes)
  assert.ok(bytes.length <= 180 * 1024)
  assert.ok(asset.width <= 1920)
  assets.push({ ...asset, sha256: sha(bytes), mime: 'image/webp' })
}
const receipt = { format: 'norcook-recipe-visuals/1', releaseId: 'norcook-four-recipes-20261030', origin, repository: 'Oak-Main/norcook', reviewedOn: '2026-10-30', assets }
if (process.argv.includes('--write')) await writeFile('public/recipe-visuals.release.json', `${JSON.stringify(receipt, null, 2)}\n`)
assert.deepEqual(JSON.parse(await readFile('public/recipe-visuals.release.json', 'utf8')), receipt)
if (process.argv.includes('--live')) {
  const get = async path => {
    const response = await fetch(`${origin}${path}`, { redirect: 'error', signal: AbortSignal.timeout(45000) })
    assert.equal(response.status, 200, path)
    return response
  }
  assert.deepEqual(await (await get('/recipe-visuals.release.json')).json(), receipt)
  for (const asset of assets) {
    const response = await get(asset.url)
    assert.match(response.headers.get('content-type') ?? '', /^image\/webp/)
    assert.equal(sha(Buffer.from(await response.arrayBuffer())), asset.sha256)
  }
  for (const route of [...new Set(assets.map(asset => asset.route))]) {
    const html = await (await get(route)).text()
    for (const asset of assets.filter(asset => asset.route === route)) {
      const images = html.match(/<img\b[^>]*>/g) ?? []
      assert.ok(images.some(tag => tag.includes(asset.file) && (asset.shot === 'hero' || tag.includes(`data-recipe-visual="${asset.file}"`))), `${route}: ${asset.file}`)
    }
  }
}
console.log(JSON.stringify({ result: 'PASS', checkedAt: new Date().toISOString(), assets: assets.length, routes: 4, live: process.argv.includes('--live') }))
