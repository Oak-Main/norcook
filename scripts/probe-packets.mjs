/**
 * Norcook corpus profiler.
 *
 * A one-off measurement tool, kept because its findings justify design choices
 * that would otherwise be taken on faith. Re-run it after any editorial change
 * to `lib/recipes.ts` or `lib/recipe-details.ts`:
 *
 *   node scripts/probe-packets.mjs
 *
 * It reports, across all 77 published recipes:
 *
 * - how many authored sub-list headings exist and which prefixes they use.
 *   This is the evidence behind the grouping regex in
 *   `lib/cooking/adapters/norcook.ts`. If a new prefix appears that the regex
 *   does not match, ingredients silently stop being grouped.
 * - whether any ingredient line repeats, which decides whether the duplicate
 *   handling in the adapter is load-bearing or merely defensive.
 * - the largest ingredient list and step count, which bounds the print and
 *   focused-view tests.
 *
 * It reads source text rather than importing the app, so it runs without a build.
 * The invariants it reports are asserted for real in
 * `tests/unit/content-parity.test.ts`; this script is a diagnostic, not a gate.
 */

import { readFile } from 'node:fs/promises'

const r = await readFile('lib/recipes.ts', 'utf8')
const d = await readFile('lib/recipe-details.ts', 'utf8')
const all =
  r.split('const BASE_RECIPES: Recipe[] = [')[1] + d.split('export const RECIPE_DETAILS')[1]

const blocks = (re) => [...all.matchAll(re)].map((m) => m[1])
const ing = blocks(/ingredients: \[([\s\S]*?)\n {4}\],/g)
const stp = blocks(/steps: \[([\s\S]*?)\n {4}\],/g)

console.log('ingredient arrays:', ing.length, '| step arrays:', stp.length)

const lines = (b) =>
  b
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.startsWith("'"))
    .map((s) => s.replace(/^'/, '').replace(/',?$/, ''))

const prefixes = new Map()
ing.forEach((b) => {
  lines(b).forEach((t) => {
    const m = /^((?:For|To make|To serve)\b[^:]{0,40}):/.exec(t)
    if (m) prefixes.set(m[1], (prefixes.get(m[1]) ?? 0) + 1)
  })
})
console.log('authored sub-group prefixes:', prefixes.size)
for (const [k, v] of prefixes) console.log('   ', JSON.stringify(k), 'x', v)

const dup = []
ing.forEach((b, i) => {
  const items = lines(b)
  const seen = new Set()
  const dupes = new Set()
  items.forEach((t) => (seen.has(t) ? dupes.add(t) : seen.add(t)))
  if (dupes.size) dup.push([i, [...dupes]])
})
console.log('recipes with duplicate ingredient lines:', dup.length, JSON.stringify(dup.slice(0, 6)))

const maxOf = (arr) => arr.reduce((m, b, i) => (b > m.n ? { n: b, i } : m), { n: 0, i: -1 })
console.log('max ingredients:', JSON.stringify(maxOf(ing.map((b) => lines(b).length))))
console.log('max steps:', JSON.stringify(maxOf(stp.map((b) => lines(b).length))))

let longestStep = ''
let longestIng = ''
stp.forEach((b) => lines(b).forEach((t) => t.length > longestStep.length && (longestStep = t)))
ing.forEach((b) => lines(b).forEach((t) => t.length > longestIng.length && (longestIng = t)))
console.log('longest step chars:', longestStep.length, '::', longestStep.slice(0, 120))
console.log('longest ingredient chars:', longestIng.length, '::', longestIng.slice(0, 120))