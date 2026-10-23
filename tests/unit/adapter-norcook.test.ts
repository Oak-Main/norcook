import { describe, expect, it } from 'vitest'

import { adaptNorcookRecipe, norcookAdapter, NORCOOK_SITE_ID } from '@/lib/cooking/adapters/norcook'
import type { CookingPacket } from '@/lib/cooking'
import {
  BLANK_STEPS,
  DUPLICATE_INGREDIENTS,
  GROUPED_INGREDIENTS,
  HEADING_FIRST,
  LONG_STEP,
  MISSING_INGREDIENTS,
  MISSING_SLUG,
  MISSING_STEPS,
  SAFETY_CRITICAL_WORDING,
} from '@/tests/fixtures/cooking-packets'

function supported(recipe: Parameters<typeof adaptNorcookRecipe>[0]): CookingPacket {
  const result = adaptNorcookRecipe(recipe)
  if (!result.supported) {
    throw new Error(`expected a supported packet, got: ${result.reason}`)
  }
  return result.packet
}

function flatIngredientTexts(packet: CookingPacket): string[] {
  return packet.groups.flatMap((group) => group.items.map((item) => item.text))
}

describe('Norcook adapter — identity', () => {
  it('carries the site id and slug that scope stored progress', () => {
    const packet = supported(GROUPED_INGREDIENTS.recipe)
    expect(packet.siteId).toBe(NORCOOK_SITE_ID)
    expect(packet.recipeId).toBe('fixture-groups')
    expect(norcookAdapter.siteId).toBe(NORCOOK_SITE_ID)
  })

  it('gives every ingredient and step a unique id', () => {
    for (const packet of [
      supported(DUPLICATE_INGREDIENTS.recipe),
      supported(GROUPED_INGREDIENTS.recipe),
      supported(HEADING_FIRST.recipe),
    ]) {
      const ids = [
        ...packet.groups.flatMap((group) => group.items.map((item) => item.id)),
        ...packet.steps.map((step) => step.id),
        ...packet.groups.map((group) => group.id),
      ]
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('Norcook adapter — duplicate ingredients', () => {
  it('keeps three identical lines as three distinct check-off items', () => {
    const packet = supported(DUPLICATE_INGREDIENTS.recipe)
    const items = packet.groups.flatMap((group) => group.items)
    const butter = items.filter((item) => item.text === '200 g butter')

    expect(butter).toHaveLength(3)
    expect(new Set(butter.map((item) => item.id)).size).toBe(3)
    // Order and count are untouched: 4 in, 4 out.
    expect(flatIngredientTexts(packet)).toEqual(DUPLICATE_INGREDIENTS.recipe.ingredients)
  })

  it('records the duplication instead of silently collapsing it', () => {
    const result = adaptNorcookRecipe(DUPLICATE_INGREDIENTS.recipe)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    expect(result.notes.map((note) => note.code)).toContain('duplicate-ingredient-text')
  })
})

describe('Norcook adapter — authored sub-list groupings', () => {
  it('splits on authored headings without altering any line', () => {
    const packet = supported(GROUPED_INGREDIENTS.recipe)
    const titled = packet.groups.filter((group) => group.title !== null)

    expect(titled.map((group) => group.title)).toEqual(['For the filling'])
    expect(flatIngredientTexts(packet)).toEqual(GROUPED_INGREDIENTS.recipe.ingredients)
  })

  it('keeps the authored prefix inside the item text', () => {
    const packet = supported(GROUPED_INGREDIENTS.recipe)
    // The grouping is presentational. The line the cook reads is unchanged.
    expect(flatIngredientTexts(packet)).toContain(
      'For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon',
    )
  })

  it('leaves no empty leading group when the first line is a heading', () => {
    const packet = supported(HEADING_FIRST.recipe)
    // The heading opens a group that runs to the next heading or the end of the
    // list; Norcook authors no signal for closing one early, so none is invented.
    expect(packet.groups).toHaveLength(1)
    expect(packet.groups[0].title).toBe('For the sauce')
    expect(packet.groups[0].items).toHaveLength(3)
    expect(flatIngredientTexts(packet)).toEqual(HEADING_FIRST.recipe.ingredients)
  })

  it('does not treat ordinary prose with "to serve" as a heading', () => {
    const packet = supported({
      slug: 'fixture-prose',
      name: 'Fixture: Prose',
      ingredients: ['Sour cream, strawberry jam and brown cheese, to serve'],
      steps: ['Stack and serve.'],
    })
    expect(packet.groups).toHaveLength(1)
    expect(packet.groups[0].title).toBeNull()
  })
})

describe('Norcook adapter — verbatim authored text', () => {
  it('reproduces every ingredient line and step byte-for-byte', () => {
    const packet = supported(SAFETY_CRITICAL_WORDING.recipe)
    expect(flatIngredientTexts(packet)).toEqual(
      SAFETY_CRITICAL_WORDING.recipe.ingredients,
    )
    expect(packet.steps.map((step) => step.text)).toEqual(
      SAFETY_CRITICAL_WORDING.recipe.steps,
    )
  })

  it('preserves temperatures, durations and warnings without normalisation', () => {
    const packet = supported(SAFETY_CRITICAL_WORDING.recipe)
    const joined = packet.steps.map((step) => step.text).join('\n')
    expect(joined).toContain('180 °C')
    expect(joined).toContain('7–9 minutes')
    expect(joined).toContain('— do not boil.')
    expect(joined).toContain('not a safe general rule')
  })

  it('never parses prose quantities into numbers', () => {
    const packet = supported(SAFETY_CRITICAL_WORDING.recipe)
    for (const group of packet.groups) {
      for (const item of group.items) {
        expect(item.quantity).toBeNull()
        expect(item.scalable).toBe(false)
      }
    }
  })

  it('numbers steps from one with no gaps', () => {
    const packet = supported(LONG_STEP.recipe)
    expect(packet.steps.map((step) => step.order)).toEqual([1])
    expect(packet.steps[0].text).toBe(LONG_STEP.recipe.steps[0])
  })

  it('marks instruction steps as never scalable', () => {
    const packet = supported(SAFETY_CRITICAL_WORDING.recipe)
    expect(packet.steps.every((step) => step.scalable === false)).toBe(true)
  })
})

describe('Norcook adapter — unsupported packets', () => {
  it('refuses a packet with no steps and says why', () => {
    const result = adaptNorcookRecipe(MISSING_STEPS.recipe)
    expect(result.supported).toBe(false)
    if (result.supported) return
    expect(result.reason).toMatch(/steps/i)
  })

  it('refuses a packet whose steps are all blank', () => {
    const result = adaptNorcookRecipe(BLANK_STEPS.recipe)
    expect(result.supported).toBe(false)
  })

  it('refuses a packet with no stable slug', () => {
    const result = adaptNorcookRecipe(MISSING_SLUG.recipe)
    expect(result.supported).toBe(false)
    if (result.supported) return
    expect(result.reason).toMatch(/slug/i)
  })

  it('still supports a packet that publishes no ingredients', () => {
    const packet = supported(MISSING_INGREDIENTS.recipe)
    expect(packet.groups).toEqual([])
    expect(packet.steps).toHaveLength(2)
  })

  it('tolerates absent optional arrays without throwing', () => {
    expect(() => adaptNorcookRecipe({ slug: 'x', name: 'X' })).not.toThrow()
    const result = adaptNorcookRecipe({ slug: 'x', name: 'X' })
    expect(result.supported).toBe(false)
  })
})

describe('Norcook adapter — scaling', () => {
  it('reports scaling unavailable with a readable reason for every packet', () => {
    const packet = supported(SAFETY_CRITICAL_WORDING.recipe)
    expect(packet.scaling.available).toBe(false)
    if (packet.scaling.available) return
    expect(packet.scaling.reason).toMatch(/yield/i)
    expect(packet.scaling.reason.length).toBeGreaterThan(20)
  })
})