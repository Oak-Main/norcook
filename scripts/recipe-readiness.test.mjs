import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire, Module } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'

const filename = resolve('lib/packet-pilot.ts')
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  fileName: filename,
}).outputText
const packetModule = new Module(filename)
packetModule.filename = filename
packetModule.paths = Module._nodeModulePaths(resolve('lib'))
const helperFilename = resolve('lib/recipe-visual-markup.ts')
const helperModule = new Module(helperFilename)
helperModule.filename = helperFilename
helperModule.paths = Module._nodeModulePaths(resolve('lib'))
helperModule._compile(ts.transpileModule(readFileSync(helperFilename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  fileName: helperFilename,
}).outputText, helperFilename)
const originalRequire = packetModule.require.bind(packetModule)
packetModule.require = name => name === './recipe-visual-markup' ? helperModule.exports : originalRequire(name)
packetModule._compile(compiled, filename)
const { pilotJsonld, pilotDescription, renderPilotArticle } = packetModule.exports
const packet = createRequire(import.meta.url)('../content/packets/kanelsnurrer.json')

test('pilot metadata retains cinnamon, knots and every letter s', () => {
  assert.equal(pilotDescription(), packet.jsonld.description.replace(/\s+/g, ' ').trim().slice(0, 185))
  assert.match(pilotDescription(), /Kanelsnurrer show their cinnamon/)
  const page = readFileSync('app/recipes/[slug]/page.tsx', 'utf8')
  assert.match(page, /const desc = pilotDescription\(\)/)
})
test('pilot structured data preserves quantities, yield and schedule while omitting unsupported authorship and ratings', () => {
  const ld = pilotJsonld()
  assert.deepEqual(ld.recipeIngredient, packet.jsonld.recipeIngredient)
  assert.deepEqual(ld.recipeInstructions, packet.jsonld.recipeInstructions)
  for (const key of ['recipeYield', 'totalTime', 'prepTime', 'cookTime']) assert.equal(ld[key], packet.jsonld[key])
  assert.equal(ld.author, undefined)
  assert.equal(ld.aggregateRating, undefined)
})
test('pilot article retains written method, recipe card and disclosed technique clip', () => {
  const html = renderPilotArticle()
  assert.match(html, /class="rpc-card"/)
  assert.match(html, /data-block="step"/)
  assert.match(html, /AI-created dough-shaping illustration/)
  assert.equal((html.match(/data-block="recipe-illustration"/g) ?? []).length, 4)
  assert.match(html, /norcook-kanelsnurrer-hero-20261030.webp/)
  assert.ok(!html.includes('src="/assets/recipes/"'))
  assert.ok(!html.includes('must match the card'))
})
