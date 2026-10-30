import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('norcook-consent-v1', 'essential')
  })
})

test('progressively renders and searches the recipe index', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'The Cultural Guide to Norway Through Food' }),
  ).toBeVisible()
  await expect(page.locator('#recipes article')).toHaveCount(12)

  await page.getByRole('button', { name: /Show 12 more/ }).click()
  await expect(page.locator('#recipes article')).toHaveCount(24)

  await page.getByRole('searchbox', { name: 'Search recipes' }).fill('gravlaks')
  await page.getByRole('button', { name: 'Explore' }).click()
  await expect(page).toHaveURL(/\?q=gravlaks#recipes$/)
  await expect(page.getByText('1 result for “gravlaks”')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gravlaks', exact: true })).toBeVisible()
})

test('persists a favourite without analytics consent', async ({ page }) => {
  await page.goto('/')
  const favourite = page
    .getByRole('button', { name: /^Save .+ to saved recipes$/ })
    .first()
  await favourite.click()
  await expect(
    page.getByRole('button', { name: /^Remove .+ from saved recipes$/ }).first(),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(
    page.getByRole('button', { name: /^Remove .+ from saved recipes$/ }).first(),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('script[src*="vercel"]')).toHaveCount(0)
})

test('saves from a recipe page and manages the collection on /saved', async ({
  page,
}) => {
  await page.goto('/recipes/gravlaks')
  const save = page.getByRole('button', {
    name: 'Save Gravlaks to saved recipes',
  })
  await expect(save).toHaveAttribute('aria-pressed', 'false')
  await save.click()
  await expect(
    page.getByRole('button', { name: 'Remove Gravlaks from saved recipes' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/saved')
  await expect(page.getByText('Saved on this device')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gravlaks' })).toBeVisible()

  // Un-saving must empty the grid immediately, with no reload.
  await page
    .getByRole('button', { name: 'Remove Gravlaks from saved recipes' })
    .click()
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible()
})

test('clears the whole collection behind a confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('norcook-favorite:gravlaks', 'true')
    window.localStorage.setItem('norcook-favorite:skillingsboller', 'true')
  })
  await page.goto('/saved')
  await expect(page.locator('article')).toHaveCount(2)

  await page.getByRole('button', { name: 'Clear all' }).click()
  // Nothing is removed until the second, explicit confirmation.
  await expect(page.getByText('Remove all 2 recipes?')).toBeVisible()
  await expect(page.locator('article')).toHaveCount(2)

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('article')).toHaveCount(2)

  await page.getByRole('button', { name: 'Clear all' }).click()
  await page.getByRole('button', { name: 'Yes, clear all' }).click()
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(0)
})

test('shows safety evidence and Recipe JSON-LD', async ({ page }) => {
  await page.goto('/recipes/gravlaks')
  await expect(page.getByRole('heading', { name: 'Read before preparing this recipe' })).toBeVisible()
  await expect(page.getByText('Qualified reviewer pending', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: /Food and Drug Administration/ })).toHaveAttribute(
    'href',
    /fda\.gov/,
  )

  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  expect(jsonLd).toBeTruthy()
  const recipe = JSON.parse(jsonLd ?? '{}')
  expect(recipe['@type']).toBe('Recipe')
  expect(recipe.name).toBe('Gravlaks')
  expect(recipe.aggregateRating).toBeUndefined()
})

test('emits evidence-backed Recipe JSON-LD across a sample of pages', async ({ page }) => {
  for (const slug of [
    'skillingsboller',
    'gravlaks',
    'farikal',
    'lefse',
    'bidos',
  ]) {
    await page.goto(`/recipes/${slug}`)
    const raw = await page.locator('script[type="application/ld+json"]').textContent()
    const recipe = JSON.parse(raw ?? '{}')
    expect(recipe['@type'], slug).toBe('Recipe')
    expect(recipe.name, slug).toBeTruthy()
    expect(recipe.url, slug).toBe(`https://www.norcook.app/recipes/${slug}`)
    expect(recipe['@id'], slug).toBe(`https://www.norcook.app/recipes/${slug}#recipe`)
    expect(recipe.inLanguage, slug).toBe('en')
    expect(recipe.recipeCuisine, slug).toBe('Norwegian')
    expect(recipe.totalTime, slug).toMatch(/^P/)
    expect(recipe.recipeIngredient.length, slug).toBeGreaterThan(0)
    expect(recipe.recipeInstructions.length, slug).toBeGreaterThan(0)
    expect(
      recipe.recipeInstructions.map((step: { position: number }) => step.position),
      slug,
    ).toEqual(recipe.recipeInstructions.map((_: unknown, index: number) => index + 1))
    // A safety record is visible evidence of a material change; a routine
    // archive check is not. The other samples must omit the date until a
    // page-level content/evidence/schema change record exists.
    if (slug === 'gravlaks') {
      expect(recipe.dateModified, slug).toBe('2026-07-21')
    } else if (slug === 'skillingsboller') {
      expect(recipe.dateModified, slug).toBe('2026-10-30')
    } else {
      expect(recipe.dateModified, slug).toBeUndefined()
    }
    // Unsupported claims must never reappear. Do not add these fields until
    // an authoritative content record supplies the fact.
    expect(recipe.aggregateRating, slug).toBeUndefined()
    expect(recipe.author, slug).toBeUndefined()
    expect(recipe.datePublished, slug).toBeUndefined()
    expect(recipe.recipeYield, slug).toBeUndefined()
    expect(recipe.nutrition, slug).toBeUndefined()
  }
})

test('every ordinary recipe carries an evidence block', async ({ page }) => {
  await page.goto('/recipes/skillingsboller')
  await expect(
    page.getByRole('heading', { name: 'How this page was made' }),
  ).toBeVisible()
  await expect(page.getByText('Content last checked')).toBeVisible()
  await expect(page.getByText(/“checked” records an editorial check/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Raw flour and dough' })).toHaveAttribute(
    'href', 'https://www.cdc.gov/food-safety/foods/no-raw-dough.html',
  )
  // The editorial policy forbids claiming a page was reviewed.
  await expect(page.getByText('Last reviewed')).toHaveCount(0)
  // Retain the empty-source contract on an unchanged recipe without citations.
  await page.goto('/recipes/vafler')
  await expect(page.getByText('No page-level sources are recorded for this recipe yet.')).toBeVisible()
})

test('region hubs are real pages with their own links and evidence', async ({
  page,
}) => {
  await page.goto('/regions/sapmi')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page.locator('a[href^="/recipes/"]').filter({ hasText: 'View Recipe' }),
  ).not.toHaveCount(0)
  const recipeLinks = await page.locator('a[href^="/recipes/"]').count()
  expect(recipeLinks).toBeGreaterThanOrEqual(8)
  await expect(
    page.getByRole('heading', { name: 'Ingredient and kitchen glossary' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sources and status' })).toBeVisible()
  await expect(page.getByText('Content last checked:')).toBeVisible()

  const raw = await page.locator('script[type="application/ld+json"]').textContent()
  const hub = JSON.parse(raw ?? '{}')
  expect(hub['@type']).toBe('CollectionPage')
  expect(hub.mainEntity.itemListElement.length).toBeGreaterThanOrEqual(8)
})

test('seasonal hubs are real pages', async ({ page }) => {
  await page.goto('/seasons/jul')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const recipeLinks = await page.locator('a[href^="/recipes/"]').count()
  expect(recipeLinks).toBeGreaterThanOrEqual(8)
  await expect(page.getByRole('heading', { name: 'Sources and status' })).toBeVisible()
})

test('a recipe links back to its region hub', async ({ page }) => {
  await page.goto('/recipes/bidos')
  // Scoped to the page body: the site header carries a Sápmi link on every
  // page, so an unscoped locator would pass without the recipe linking at all.
  await page
    .locator('main')
    .getByRole('link', { name: /Sápmi/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/regions\/sapmi$/)

  // And the provenance block carries its own route back.
  await page.goto('/recipes/bidos')
  await page
    .locator('section[aria-labelledby="provenance-heading"]')
    .getByRole('link', { name: 'Sápmi' })
    .click()
  await expect(page).toHaveURL(/\/regions\/sapmi$/)
})

test('serves a branded 404 and discovery files', async ({ page, request }) => {
  const response = await page.goto('/this-route-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'This trail ends before the kitchen' })).toBeVisible()

  const robots = await request.get('/robots.txt')
  expect(await robots.text()).toContain('Sitemap: https://www.norcook.app/sitemap.xml')
  const sitemap = await request.get('/sitemap.xml')
  expect(await sitemap.text()).toContain('/recipes/gravlaks')
})

test('homepage CollectionPage JSON-LD mirrors the initially linked recipe preview', async ({
  page,
}) => {
  await page.goto('/')

  const raw = await page.locator('script[type="application/ld+json"]').textContent()
  const graph = JSON.parse(raw ?? '{}')['@graph'] as Array<Record<string, unknown>>
  const website = graph.find((node) => node['@type'] === 'WebSite')
  const collection = graph.find((node) => node['@type'] === 'CollectionPage')

  expect(website?.url).toBe('https://www.norcook.app/')
  expect(collection?.url).toBe('https://www.norcook.app/')

  const itemList = collection?.mainEntity as {
    numberOfItems: number
    itemListElement: Array<{ name: string; url: string }>
  }
  const cards = page.locator('#recipes article')
  const linkedRecipeUrls = await cards
    .getByRole('link', { name: 'View Recipe' })
    .evaluateAll((links) =>
      links.map((link) =>
        new URL(link.getAttribute('href') ?? '', 'https://www.norcook.app').toString(),
      ),
    )
  const cardNames = await cards.locator('h3').allTextContents()

  expect(itemList.numberOfItems).toBe(12)
  expect(itemList.itemListElement.map((item) => item.url)).toEqual(linkedRecipeUrls)
  expect(itemList.itemListElement.map((item) => item.name)).toEqual(cardNames)
})

test('sitemap emits only page-specific, published freshness dates', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  const xml = await sitemap.text()
  const entries = new Map(
    [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => {
      const url = entry.match(/<loc>([^<]+)<\/loc>/)?.[1]
      if (!url) throw new Error('Every sitemap entry must include a location.')

      const lastModified = entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]
      return [new URL(url).pathname, lastModified]
    }),
  )

  expect(entries.get('/')).toBeUndefined()
  expect(entries.get('/editorial-policy')).toBeUndefined()
  expect(entries.get('/affiliate-disclosure')).toBeUndefined()
  expect(entries.get('/privacy')).toContain('2026-08-23')
  expect(entries.get('/terms')).toContain('2026-08-23')
  expect(entries.get('/recipes/gravlaks')).toContain('2026-07-21')
  expect(entries.get('/recipes/skillingsboller')).toContain('2026-10-30')
  expect(entries.get('/recipes/eplekake')).toContain('2026-10-30')
  expect(entries.get('/recipes/vafler')).toBeUndefined()
  expect(entries.get('/regions/sapmi')).toBeUndefined()
  expect(entries.get('/seasons/jul')).toBeUndefined()
})

test('hosts the IndexNow key and keeps dispatch protected until configured', async ({
  request,
}) => {
  const key = '279f5e63061085792b5a0624353b2647c5d3cde9cc5ea0d1'
  const keyFile = await request.get(`/${key}.txt`)
  expect(keyFile.status()).toBe(200)
  expect((await keyFile.text()).trim()).toBe(key)

  const dispatch = await request.post('/api/indexnow', {
    data: { urls: ['https://www.norcook.app/recipes/gravlaks'] },
  })
  // Local and CI environments do not carry the server-side dispatch secret.
  // If an environment configures it, an unauthenticated request remains 401.
  expect([401, 503]).toContain(dispatch.status())
})

test('every sitemap URL returns 200 and is indexable', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const paths = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  )
  expect(paths.length).toBeGreaterThan(80)
  // /saved is noindex and device-specific; it must never be advertised.
  expect(paths).not.toContain('/saved')

  for (const path of paths) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    const body = await response.text()
    expect(body, path).not.toContain('name="robots" content="noindex')
  }
})

test('applies the hardened header baseline to pages, 404s, and the manifest', async ({
  request,
}) => {
  for (const [path, expectedStatus] of [
    ['/', 200],
    ['/this-route-does-not-exist', 404],
    ['/manifest.webmanifest', 200],
    ['/icons/icon-192.png', 200],
  ] as const) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(expectedStatus)
    const headers = response.headers()
    expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'")
    expect(headers['content-security-policy'], path).toContain("script-src-attr 'none'")
    expect(headers['content-security-policy'], path).toContain("style-src 'self'")
    expect(headers['content-security-policy'], path).toContain("style-src-attr 'unsafe-inline'")
    expect(headers['content-security-policy'], path).toContain("style-src-elem 'self'")
    expect(headers['x-content-type-options'], path).toBe('nosniff')
    expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy'], path).toContain('camera=()')
    expect(headers['x-frame-options'], path).toBe('DENY')
    expect(headers['strict-transport-security'], path).toBe(
      'max-age=63072000; includeSubDomains; preload',
    )
    expect(headers['cross-origin-opener-policy'], path).toBe('same-origin')
    expect(headers['cross-origin-embedder-policy'], path).toBe('require-corp')
    expect(headers['cross-origin-resource-policy'], path).toBe('same-origin')
    expect(headers['access-control-allow-origin'], path).not.toBe('*')
  }
})

test('keeps CORS limited to the same-origin newsletter contract', async ({
  request,
}) => {
  const documentResponse = await request.get('/')
  expect(documentResponse.headers()['access-control-allow-origin']).toBeUndefined()

  const apiResponse = await request.get('/api/newsletter')
  expect(apiResponse.status()).toBe(405)
  expect(apiResponse.headers()['access-control-allow-origin']).toBe(
    'https://www.norcook.app',
  )
  expect(apiResponse.headers()['access-control-allow-methods']).toBe('POST')

  const indexNowResponse = await request.post('/api/indexnow', {
    data: { urls: ['https://www.norcook.app/recipes/gravlaks'] },
  })
  expect(indexNowResponse.headers()['access-control-allow-origin']).toBeUndefined()
})

test('serves a complete PWA manifest and a conservative worker', async ({
  page,
  request,
}) => {
  const manifestResponse = await request.get('/manifest.webmanifest')
  expect(manifestResponse.status()).toBe(200)
  const manifest = await manifestResponse.json()
  const manifestIcons = [
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-512-maskable.png',
  ]
  const precacheIcons = ['/icons/icon-180.png', ...manifestIcons]
  expect(manifest.start_url).toBe('/')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual(
    expect.arrayContaining(manifestIcons),
  )

  for (const icon of precacheIcons) {
    const response = await request.get(icon)
    expect(response.status(), icon).toBe(200)
    expect(response.headers()['content-type'], icon).toContain('image/png')
  }

  const workerResponse = await request.get('/sw.js')
  expect(workerResponse.status()).toBe(200)
  expect(workerResponse.headers()['content-type']).toContain('javascript')
  expect(workerResponse.headers()['cache-control']).toContain('no-cache')
  const worker = await workerResponse.text()
  expect(worker).toContain("const CACHE_VERSION = 'norcook-static-v2'")
  expect(worker).toContain("url.pathname.startsWith('/_next/static/')")
  expect(worker).toContain('Promise.allSettled')
  expect(worker).not.toContain('cache.addAll')

  await page.addInitScript(() => {
    window.localStorage.setItem('norcook-consent-v1', 'essential')
  })
  await page.goto('/')
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration('/')
          return registration?.active?.scriptURL.endsWith('/sw.js') ?? false
        }),
      { timeout: 10_000 },
    )
    .toBe(true)
})

test('shows honest default privacy and newsletter states', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Newsletter signups are not open yet.')).toBeVisible()
  await expect(
    page.getByText('No email address is collected on this site today.'),
  ).toBeVisible()
  // The acceptance criterion: no conversion control at all, not a disabled one.
  await expect(page.locator('input[name="email"]')).toHaveCount(0)
  await expect(page.getByText('Free Download')).toHaveCount(0)

  await page.getByRole('button', { name: 'Cookie Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Your privacy choice' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Allow analytics' })).toBeDisabled()
})

test('keeps governance, privacy, and safety claims fail-closed by default', async ({ page }) => {
  await page.goto('/privacy')
  await expect(
    page.getByRole('heading', { name: 'Operator identification and governance gate' }),
  ).toBeVisible()
  await expect(page.getByText('Oak and Main Developers LLC', { exact: true })).toBeVisible()
  await expect(
    page.getByText('2108 N St., Sacramento, CA 95816', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('working privacy contact, and data-rights request procedure'),
  ).toBeVisible()
  await expect(page.getByText('Optional analytics is disabled.')).toBeVisible()
  await expect(page.getByText('Newsletter signup is disabled.')).toBeVisible()

  await page.goto('/recipes/gravlaks')
  await expect(page.getByText('Review status: Qualified reviewer pending')).toBeVisible()
  await expect(page.getByText('A named, qualified food-safety owner has not yet signed off.')).toBeVisible()
})
