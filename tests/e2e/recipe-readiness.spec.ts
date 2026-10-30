import { test, expect } from '@playwright/test'
import visuals from '../../lib/recipe-visuals.json'

test('Kanelsnurrer index card follows the serving packet schedule and ingredient set', async ({ page }) => {
  await page.goto('/regions/modern-viral')
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Kanelsnurrer', exact: true }) })
  await expect(card).toContainText('3–3¾ hr (incl. cooling)')
  await expect(card).not.toContainText('Pearl sugar')
  await expect(card.getByRole('link', { name: 'View Recipe' })).toHaveAttribute('href', '/recipes/kanelsnurrer')
})

for (const slug of ['skillingsboller', 'eplekake', 'gravlaks', 'kanelsnurrer']) {
  test(`${slug}: all new illustration placements load and disclose AI origin`, async ({ page }) => {
    await page.goto(`/recipes/${slug}`)
    for (const asset of visuals.filter(item => item.recipe === slug)) {
      const image = asset.shot === 'hero'
        ? page.locator('main img').filter({ hasNot: page.locator('[hidden]') }).first()
        : page.locator(`img[data-recipe-visual="${asset.file}"]`)
      await image.scrollIntoViewIfNeeded()
      await expect(image).toHaveAttribute('alt', /\S/)
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
      const source = await image.getAttribute('src')
      expect(source).toContain(asset.file)
    }
    await expect(page.getByText(/AI-created illustration/).first()).toBeVisible()
  })
}
test('kanelsnurrer: metadata preserves words and structured data matches the packet', async ({ page }) => {
  await page.goto('/recipes/kanelsnurrer')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Kanelsnurrer show their cinnamon/)
  const recipe = await page.locator('script[type="application/ld+json"]').evaluateAll(elements => elements.map(element => JSON.parse(element.textContent ?? '{}')).find(item => item['@type'] === 'Recipe'))
  expect(recipe.author).toBeUndefined()
  expect(recipe.aggregateRating).toBeUndefined()
  expect(recipe.recipeYield).toBe('Makes 12 knots')
})
