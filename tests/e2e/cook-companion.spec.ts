import { expect, test, type Page } from '@playwright/test'

/**
 * Cook companion end-to-end coverage.
 *
 * Runs against the production build via `pnpm start`, so what is asserted is
 * the real rendered page, real CSS and real browser storage — not a dev server
 * approximation.
 *
 * Representative packets used here:
 * - `skillingsboller` — 9 ingredients including an authored "For the filling:"
 *   sub-list, 6 steps. Exercises grouping and long content.
 * - `gravlaks`        — 4 steps plus a food-safety callout with authority
 *                       sources. Exercises safety printing and print-to-PDF.
 */

const GROUPED = '/recipes/skillingsboller'
const SAFETY = '/recipes/gravlaks'

/** The consent key the rest of the suite also sets. */
async function grantEssentialConsent(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('norcook-consent-v1', 'essential')
    } catch {
      /* storage may be denied in a dedicated test */
    }
  })
}

function cookBar(page: Page) {
  return page.locator('[data-cook-bar]')
}

function steps(page: Page) {
  return page.locator('[data-cook-step-id]')
}

function ingredients(page: Page) {
  return page.locator('[data-cook-ingredient-id]')
}

test.describe('reading the recipe', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('renders every authored ingredient line and step verbatim', async ({ page }) => {
    await page.goto(GROUPED)

    const ingredientLines = await ingredients(page).allInnerTexts()
    expect(ingredientLines).toHaveLength(9)
    // Verbatim, including the authored sub-list prefix and preparation wording.
    expect(ingredientLines.map((line) => line.trim())).toContain(
      '500 g strong wheat flour',
    )
    expect(ingredientLines.map((line) => line.trim())).toContain(
      'For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon',
    )
    expect(ingredientLines.map((line) => line.trim())).toContain(
      'Pearl sugar and one beaten egg, to finish',
    )

    const stepTexts = await steps(page).allInnerTexts()
    expect(stepTexts).toHaveLength(6)
    expect(
      stepTexts.some((text) =>
        text.includes('bake at 220°C for 10–12 minutes until deep gold'),
      ),
    ).toBe(true)
  })

  test('keeps temperatures, durations and warnings intact', async ({ page }) => {
    await page.goto(SAFETY)
    const text = await page.locator('[data-cook-steps]').innerText()
    expect(text).toContain('48 hours')
    expect(text).toContain('24 hours in a typical home freezer is not a safe general rule')
  })

  test('surfaces the authored sub-list heading', async ({ page }) => {
    await page.goto(GROUPED)
    await expect(page.locator('[data-cook-group-title]')).toHaveText('For the filling')
  })

  test('does not duplicate the recipe anywhere on the page', async ({ page }) => {
    await page.goto(GROUPED)
    const occurrences = await page
      .getByText('500 g strong wheat flour', { exact: false })
      .count()
    expect(occurrences).toBe(1)
  })

  test('explains why scaling is unavailable instead of offering it', async ({ page }) => {
    await page.goto(GROUPED)
    await expect(page.locator('[data-cook-scaling-note]')).toContainText(/yield/i)
    await expect(page.getByRole('button', { name: /servings|scale/i })).toHaveCount(0)
  })
})

test.describe('progress', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('checks off an ingredient and a step, and survives a reload', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    await ingredients(page).first().getByRole('checkbox').check()
    await steps(page).first().getByRole('checkbox').check()

    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '1 of 6 steps done',
    )

    await page.reload()

    await expect(ingredients(page).first().getByRole('checkbox')).toBeChecked()
    await expect(steps(page).first().getByRole('checkbox')).toBeChecked()
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '1 of 6 steps done',
    )
  })

  test('moves through steps with previous and next', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(steps(page).nth(1)).toHaveAttribute('data-cook-active', 'true')

    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(steps(page).nth(0)).toHaveAttribute('data-cook-active', 'true')

    for (let index = 0; index < 5; index += 1) {
      await page.getByRole('button', { name: 'Next' }).click()
    }
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  test('never shows one recipe\'s progress on another', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })
    await ingredients(page).first().getByRole('checkbox').check()
    await steps(page).first().getByRole('checkbox').check()

    await page.goto(SAFETY)
    await cookBar(page).waitFor({ state: 'visible' })

    for (const checkbox of await ingredients(page).all()) {
      await expect(checkbox.getByRole('checkbox')).not.toBeChecked()
    }
    for (const checkbox of await steps(page).all()) {
      await expect(checkbox.getByRole('checkbox')).not.toBeChecked()
    }
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '0 of 4 steps done',
    )
  })

  test('offers a reset when the stored revision no longer matches', async ({ page }) => {
    // Seed a value written against an older content revision.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'norcook:cook:v1:norcook:skillingsboller',
        JSON.stringify({
          v: 1,
          siteId: 'norcook',
          recipeId: 'skillingsboller',
          revision: 'r-stale0000000000000000000000000000',
          updatedAt: 1,
          progress: {
            checkedIngredients: ['d:ing:0:0', 'd:ing:0:1'],
            completedSteps: ['d:step:1', 'd:step:2', 'd:step:3'],
            activeStepId: 'd:step:3',
          },
        }),
      )
    })

    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    // The stale notice is shown…
    await expect(page.locator('[data-cook-stale-notice]')).toBeVisible()
    await expect(page.locator('[data-cook-stale-notice]')).toContainText(
      /has changed since your last visit/i,
    )

    // …and the old ids are NOT applied: nothing is marked complete.
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '0 of 6 steps done',
    )
    for (const step of await steps(page).all()) {
      await expect(step.getByRole('checkbox')).not.toBeChecked()
    }

    await page.getByRole('button', { name: 'Start fresh' }).click()
    await expect(page.locator('[data-cook-stale-notice]')).toHaveCount(0)
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '0 of 6 steps done',
    )
  })

  test('resets progress on request and explains device-local storage', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })
    await cookBar(page).getByRole('button', { name: 'Reset' }).click()

    await steps(page).first().getByRole('checkbox').check()
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '1 of 6 steps done',
    )

    await cookBar(page).getByRole('button', { name: 'Reset' }).click()
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '0 of 6 steps done',
    )
    await expect(steps(page).first().getByRole('checkbox')).not.toBeChecked()

    await expect(cookBar(page)).toContainText(/this browser on this device only/i)
    await expect(cookBar(page)).toContainText(/clearing your browser data removes it/i)
  })

  test('keeps reading and cooking working when storage is denied', async ({ page }) => {
    await page.addInitScript(() => {
      const deny = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      }
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => ({
          getItem: deny,
          setItem: deny,
          removeItem: deny,
          clear: deny,
          key: () => null,
          length: 0,
        }),
      })
    })

    await page.goto(GROUPED)

    // The recipe is fully readable.
    await expect(ingredients(page)).toHaveCount(9)
    await expect(steps(page)).toHaveCount(6)

    // The controls still function within the visit.
    await ingredients(page).first().getByRole('checkbox').check()
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '1 of 9 ingredients gathered',
    )
    await steps(page).first().getByRole('checkbox').check()
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '1 of 6 steps done',
    )
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(steps(page).nth(1)).toHaveAttribute('data-cook-active', 'true')

    // And the limitation is stated rather than hidden.
    await expect(page.locator('[data-cook-storage-notice]')).toBeVisible()
  })
})

test.describe('focused cooking view', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('shows one step at a time but always keeps the full recipe reachable', async ({
    page,
  }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    await page.getByRole('button', { name: 'Focus mode' }).click()

    await expect(page.locator('[data-cook-focused="true"]')).toHaveCount(1)
    await expect(steps(page).nth(0)).toBeVisible()
    await expect(steps(page).nth(3)).toBeHidden()

    await expect(page.getByRole('button', { name: 'Show full recipe' })).toBeVisible()
    await page.getByRole('button', { name: 'Show full recipe' }).click()
    await expect(steps(page).nth(3)).toBeVisible()
    await expect(steps(page)).toHaveCount(6)
  })
})

test.describe('shopping list', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('copies a grouped list that preserves wording and never merges', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    await page.getByRole('button', { name: 'Copy shopping list' }).click()
    await expect(
      page.getByText('Shopping list copied to your clipboard.'),
    ).toBeVisible()

    const clipboard = await page.evaluate(() => navigator.clipboard.readText())

    expect(clipboard).toContain('Skillingsboller')
    expect(clipboard).toContain('norcook.app')
    // Group heading preserved, and the full authored line kept verbatim.
    expect(clipboard).toContain('For the filling')
    expect(clipboard).toContain(
      '• For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon',
    )
    // Preparation qualifiers survive.
    expect(clipboard).toContain('250 ml whole milk, lukewarm')
    // Nothing is invented or converted.
    expect(clipboard).not.toMatch(/\b(oz|lb|cup)\b/i)
    expect(clipboard).not.toMatch(/750\s*(g|ml)/)

    // One bullet per authored ingredient.
    const bullets = clipboard.split('\n').filter((line) => line.startsWith('• '))
    expect(bullets).toHaveLength(9)
  })

  test('falls back to selectable text when the clipboard is refused', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error('Write permission denied.')),
        },
      })
    })

    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Copy shopping list' }).click()

    // It must not claim success.
    await expect(
      page.getByText('Shopping list copied to your clipboard.'),
    ).toHaveCount(0)

    const fallback = page.locator('[data-cook-copy-fallback] textarea')
    await expect(fallback).toBeVisible()
    await expect(fallback).toHaveValue(/For the filling/)
    await expect(page.getByText(/select and copy this list manually/i)).toBeVisible()
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('still serves a complete, readable recipe', async ({ page }) => {
    await page.goto(GROUPED)

    await expect(page.getByRole('heading', { name: 'Skillingsboller' })).toBeVisible()
    await expect(ingredients(page)).toHaveCount(9)
    await expect(steps(page)).toHaveCount(6)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toContain('500 g strong wheat flour')
    expect(bodyText).toContain('bake at 220°C for 10–12 minutes until deep gold')

    // The safety-sensitive wording is still present.
    await page.goto(SAFETY)
    expect(await page.locator('body').innerText()).toContain(
      '24 hours in a typical home freezer is not a safe general rule',
    )
  })

  test('hides controls that cannot work, rather than showing dead buttons', async ({
    page,
  }) => {
    await page.goto(GROUPED)
    await expect(cookBar(page)).toBeHidden()
    await expect(page.getByRole('button', { name: 'Copy shopping list' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Focus mode' })).toBeHidden()
  })
})

test.describe('keyboard only', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('reaches and toggles an ingredient with the keyboard', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    const first = ingredients(page).first().getByRole('checkbox')
    await first.focus()
    await expect(first).toBeFocused()

    // A visible focus ring is present, not suppressed.
    const outline = await first.evaluate((node) => {
      const box = node.nextElementSibling as HTMLElement | null
      return box ? getComputedStyle(box).outlineStyle : ''
    })
    expect(outline).toBe('solid')

    await page.keyboard.press('Space')
    await expect(first).toBeChecked()
    // The ingredient count is what moved; no step was touched.
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '0 of 6 steps done',
    )
    await expect(page.locator('[data-cook-progress-label]')).toContainText(
      '1 of 9 ingredients gathered',
    )
  })

  test('drives step navigation with the keyboard', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    await page.getByRole('button', { name: 'Next' }).focus()
    await page.keyboard.press('Enter')
    await expect(steps(page).nth(1)).toHaveAttribute('data-cook-active', 'true')
  })

  test('keeps the sticky control bar clear of content on a narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    // Below the lg breakpoint the bar must not be pinned, so it cannot cover a
    // step or steal keyboard focus from one.
    const position = await cookBar(page).evaluate(
      (node) => getComputedStyle(node).position,
    )
    expect(position).toBe('static')
  })
})

test.describe('print', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('prints the whole recipe with controls hidden and content kept', async ({
    page,
  }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })
    await page.emulateMedia({ media: 'print' })

    // Every step is present exactly once.
    await expect(steps(page)).toHaveCount(6)
    for (const step of await steps(page).all()) {
      await expect(step).toBeVisible()
    }

    // Every ingredient is present.
    await expect(ingredients(page)).toHaveCount(9)

    // Interactive chrome is gone, its content is not.
    await expect(cookBar(page)).toBeHidden()
    await expect(page.getByRole('button', { name: 'Copy shopping list' })).toBeHidden()

    // The recipe title lives inside the hero; flattening must keep it legible.
    const hero = page.locator('[data-recipe-hero]')
    await expect(hero).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Skillingsboller' })).toBeVisible()
    const titleColour = await page
      .getByRole('heading', { name: 'Skillingsboller' })
      .evaluate((node) => getComputedStyle(node).color)
    expect(titleColour).toBe('rgb(0, 0, 0)')

    // Checkbox affordances are dropped; the authored text is not.
    const firstIngredient = ingredients(page).first()
    await expect(firstIngredient).toBeVisible()
    await expect(firstIngredient).toContainText('500 g strong wheat flour')
    await expect(
      firstIngredient.getByRole('checkbox'),
    ).toBeHidden()
  })

  test('prints hidden steps when focus mode is on', async ({ page }) => {
    await page.goto(GROUPED)
    await cookBar(page).waitFor({ state: 'visible' })

    await page.getByRole('button', { name: 'Focus mode' }).click()
    // On screen only one step is visible.
    await expect(steps(page).nth(4)).toBeHidden()

    await page.emulateMedia({ media: 'print' })

    // On paper, all of them are.
    await expect(steps(page)).toHaveCount(6)
    for (const step of await steps(page).all()) {
      await expect(step).toBeVisible()
    }
    await expect(
      page.locator('[data-cook-steps]'),
    ).toContainText('bake at 220°C for 10–12 minutes until deep gold')
  })

  test('prints the food-safety callout with its authority sources', async ({ page }) => {
    await page.goto(SAFETY)
    await cookBar(page).waitFor({ state: 'visible' })
    await page.emulateMedia({ media: 'print' })

    const safety = page.locator('[data-recipe-safety]')
    await expect(safety).toBeVisible()
    await expect(safety).toContainText('Read before preparing this recipe')
    await expect(safety).toContainText('Qualified reviewer pending')
    await expect(safety).toContainText('Food and Drug Administration')
    // A printed copy needs the source URL, which the stylesheet appends as
    // generated content — so it is asserted via computed style, not innerText.
    const printedHref = await page
      .locator('[data-recipe-safety] a[href*="fda.gov"]')
      .evaluate((node) => getComputedStyle(node, '::after').content)
    expect(printedHref).toContain('fda.gov')
  })

  test('leaves the sticky ingredient rail unpinned for pagination', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(SAFETY)
    await cookBar(page).waitFor({ state: 'visible' })
    await page.emulateMedia({ media: 'print' })

    const position = await page
      .locator('[data-cook-ingredients]')
      .evaluate((node) => getComputedStyle(node).position)
    expect(position).toBe('static')
  })
})

test.describe('structured data', () => {
  test.beforeEach(async ({ page }) => {
    await grantEssentialConsent(page)
  })

  test('publishes unchanged Recipe JSON-LD alongside the companion', async ({ page }) => {
    await page.goto(GROUPED)
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent()
    const recipe = JSON.parse(jsonLd ?? '{}')

    expect(recipe['@type']).toBe('Recipe')
    expect(recipe.name).toBe('Skillingsboller')
    expect(recipe.aggregateRating).toBeUndefined()
    expect(recipe.recipeIngredient).toHaveLength(9)
    expect(recipe.recipeIngredient).toContain(
      'For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon',
    )
    expect(recipe.recipeInstructions).toHaveLength(6)
    expect(recipe.recipeInstructions[0]['@type']).toBe('HowToStep')
  })
})