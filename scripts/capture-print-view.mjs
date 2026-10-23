import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.NORCOOK_BASE_URL ?? 'http://127.0.0.1:3000'
await mkdir('review', { recursive: true })

const browser = await chromium.launch()

for (const [slug, label] of [
  ['skillingsboller', 'print-view-skillingsboller'],
  ['gravlaks', 'print-view-gravlaks'],
]) {
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 }, // A4 at 96dpi
    deviceScaleFactor: 2,
  })
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('norcook-consent-v1', 'essential')
    } catch {
      /* ignore */
    }
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/recipes/${slug}`, { waitUntil: 'networkidle' })
  await page.locator('[data-cook-bar]').waitFor({ state: 'visible' })

  // Emulate print media so the screenshot shows the printed stylesheet, then
  // lay the page out at A4 width to see pagination behaviour.
  await page.emulateMedia({ media: 'print' })
  await page.addStyleTag({
    content: 'body { width: 180mm; margin: 0 auto; }',
  })
  await page.screenshot({
    path: `review/${label}.png`,
    fullPage: true,
  })
  console.log(`review/${label}.png`)
  await context.close()
}

await browser.close()