/**
 * Captures review evidence for the cook companion pilot.
 *
 * Writes into `review/`:
 *   - one print-to-PDF per representative recipe (A4, print media emulated)
 *   - desktop and mobile screenshots of the live page
 *   - a screenshot of focus mode
 *   - `review/evidence.json` recording what was captured, including page counts
 *
 * Run against an already-running production server:
 *   pnpm build && pnpm start        # in one shell
 *   node scripts/capture-review-evidence.mjs   # in another
 *
 * The PDF is an artefact for human review. Print *completeness* is proven
 * separately by the Playwright print suite, which asserts every step and
 * ingredient is visible under `media: print`; this script does not attempt to
 * text-extract the PDF and does not claim to.
 */

import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.NORCOOK_BASE_URL ?? 'http://127.0.0.1:3000'
const OUT = 'review'

const RECIPES = [
  {
    slug: 'skillingsboller',
    why: 'grouped ingredients with an authored "For the filling" sub-list, 6 steps, longest ingredient list',
  },
  { slug: 'gravlaks', why: 'carries a food-safety callout with authority sources' },
  { slug: 'kransekake', why: 'advanced technique, temperatures and durations, 4-step method' },
  { slug: 'fiskesuppe', why: 'long final step, temperatures and doneness wording' },
]

const DESKTOP = { width: 1440, height: 1000 }
const MOBILE = { width: 390, height: 844 }

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const evidence = {
  baseUrl: BASE,
  capturedAt: new Date().toISOString(),
  artefacts: [],
}

async function withPage(viewport, fn) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('norcook-consent-v1', 'essential')
    } catch {
      /* ignore */
    }
  })
  const page = await context.newPage()
  try {
    return await fn(page)
  } finally {
    await context.close()
  }
}

/** Crude but reliable page count for a Chromium-produced PDF. */
function pdfPageCount(buffer) {
  const text = buffer.toString('latin1')
  const counts = [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length
  return counts || (text.match(/\/Count\s+(\d+)/)?.[1] ? Number(text.match(/\/Count\s+(\d+)/)[1]) : 0)
}

for (const recipe of RECIPES) {
  const url = `${BASE}/recipes/${recipe.slug}`

  await withPage(DESKTOP, async (page) => {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('[data-cook-bar]').waitFor({ state: 'visible' })

    await page.screenshot({
      path: path.join(OUT, `screen-desktop-${recipe.slug}.png`),
      fullPage: true,
    })
    evidence.artefacts.push({
      file: `screen-desktop-${recipe.slug}.png`,
      kind: 'screenshot',
      viewport: DESKTOP,
      recipe: recipe.slug,
      why: recipe.why,
    })

    // Print-to-PDF, with print media emulated so the same rules apply that the
    // print suite asserts against.
    await page.emulateMedia({ media: 'print' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: false,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    })
    const file = `print-${recipe.slug}.pdf`
    await writeFile(path.join(OUT, file), pdf)
    evidence.artefacts.push({
      file,
      kind: 'print-pdf',
      recipe: recipe.slug,
      pages: pdfPageCount(pdf),
      bytes: pdf.length,
      why: recipe.why,
    })
    await page.emulateMedia({ media: 'screen' })
  })

  await withPage(MOBILE, async (page) => {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('[data-cook-bar]').waitFor({ state: 'visible' })
    await page.screenshot({
      path: path.join(OUT, `screen-mobile-${recipe.slug}.png`),
      fullPage: true,
    })
    evidence.artefacts.push({
      file: `screen-mobile-${recipe.slug}.png`,
      kind: 'screenshot',
      viewport: MOBILE,
      recipe: recipe.slug,
      why: 'narrow viewport: tap targets and an unpinned control bar',
    })
  })
}

// Focus mode, captured so a reviewer can see the single-step view.
await withPage(DESKTOP, async (page) => {
  await page.goto(`${BASE}/recipes/skillingsboller`, { waitUntil: 'networkidle' })
  await page.locator('[data-cook-bar]').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Focus mode' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.screenshot({ path: path.join(OUT, 'focus-mode-skillingsboller.png') })

  // And the same state on paper, which must still carry every step.
  await page.emulateMedia({ media: 'print' })
  const pdf = await page.pdf({ format: 'A4', printBackground: false })
  await writeFile(path.join(OUT, 'print-focus-mode-skillingsboller.pdf'), pdf)
  evidence.artefacts.push({
    file: 'focus-mode-skillingsboller.png',
    kind: 'screenshot',
    recipe: 'skillingsboller',
    why: 'focus mode showing a single step on screen',
  })
  evidence.artefacts.push({
    file: 'print-focus-mode-skillingsboller.pdf',
    kind: 'print-pdf',
    recipe: 'skillingsboller',
    pages: pdfPageCount(pdf),
    bytes: pdf.length,
    why: 'focus mode on screen must still print every step',
  })
})

await browser.close()
await writeFile(path.join(OUT, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)

for (const item of evidence.artefacts) {
  const detail = item.kind === 'print-pdf' ? `${item.pages} page(s)` : ''
  console.log(`${item.file.padEnd(46)} ${item.kind.padEnd(11)} ${detail}`)
}
console.log(`\nEvidence written to ${OUT}/evidence.json`)