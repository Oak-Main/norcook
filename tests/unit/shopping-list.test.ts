import { describe, expect, it } from 'vitest'

import { adaptNorcookRecipe } from '@/lib/cooking/adapters/norcook'
import { buildShoppingList } from '@/lib/cooking'
import {
  DUPLICATE_INGREDIENTS,
  GROUPED_INGREDIENTS,
  HEADING_FIRST,
  LONG_STEP,
  MISSING_INGREDIENTS,
  SAFETY_CRITICAL_WORDING,
} from '@/tests/fixtures/cooking-packets'

const listFor = (recipe: Parameters<typeof adaptNorcookRecipe>[0], source?: string) => {
  const result = adaptNorcookRecipe(recipe)
  if (!result.supported) throw new Error('fixture should be supported')
  return buildShoppingList(result.packet, source ? { source } : {})
}

describe('shopping list preserves authored lines verbatim', () => {
  it('emits every ingredient line exactly as authored', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe)
    for (const line of GROUPED_INGREDIENTS.recipe.ingredients ?? []) {
      expect(list).toContain(`• ${line}`)
    }
  })

  it('keeps preparation qualifiers attached to their line', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe)
    expect(list).toContain('• 250 ml whole milk, lukewarm')
    expect(list).toContain('• Pearl sugar and one beaten egg, to finish')
  })

  it('keeps lines with no stated quantity intact', () => {
    const list = listFor(SAFETY_CRITICAL_WORDING.recipe)
    expect(list).toContain('• Crushed juniper berries and black pepper, optional')
  })

  it('keeps the authored sub-list heading and the full prefixed line', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe)
    expect(list).toMatch(/^For the filling$/m)
    expect(list).toContain('• For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon')
  })

  it('preserves headings in authored order', () => {
    const list = listFor(HEADING_FIRST.recipe)
    expect(list).toMatch(/For the sauce[\s\S]*400 g firm white fish[\s\S]*200 ml double cream/)
  })
})

describe('shopping list never merges or combines', () => {
  it('keeps three identical lines as three lines', () => {
    const list = listFor(DUPLICATE_INGREDIENTS.recipe)
    const occurrences = list.split('\n').filter((line) => line.includes('200 g butter'))
    expect(occurrences).toHaveLength(3)
  })

  it('does not add together units that appear on neighbouring lines', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe)
    expect(list).toContain('• 500 g strong wheat flour')
    expect(list).toContain('• 250 ml whole milk, lukewarm')
    // No combined figure may appear.
    expect(list).not.toMatch(/750\s*(g|ml)/)
  })

  it('does not convert between mass and volume anywhere', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe)
    // A converter would emit ounces or cups. None may appear.
    expect(list).not.toMatch(/\b(oz|lb|cup|fl oz)\b/i)
  })

  it('never invents a number that the recipe did not author', () => {
    const recipe = adaptNorcookRecipe(LONG_STEP.recipe)
    if (!recipe.supported) throw new Error('fixture should be supported')
    const list = buildShoppingList(recipe.packet)
    expect(list).toContain('• 2 carrots, peeled and cut into very thin even batons')
    expect(list).not.toMatch(/\d+(\.\d+)?\s*(?:x|×)\s*\d/i)
  })
})

describe('shopping list shape', () => {
  it('leads with the recipe title and an INGREDIENTS heading', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe)
    expect(list.split('\n')[0]).toBe('Fixture: Grouped')
    expect(list).toContain('INGREDIENTS')
  })

  it('includes the source when one is supplied', () => {
    const list = listFor(GROUPED_INGREDIENTS.recipe, 'norcook.app')
    expect(list.split('\n')[1]).toBe('norcook.app')
  })

  it('is byte-identical for the same packet', () => {
    expect(listFor(GROUPED_INGREDIENTS.recipe)).toBe(listFor(GROUPED_INGREDIENTS.recipe))
  })

  it('says so plainly when a recipe publishes no ingredients', () => {
    const list = listFor(MISSING_INGREDIENTS.recipe)
    expect(list).toContain('no ingredient list published')
  })

  it('never includes step text', () => {
    const list = listFor(LONG_STEP.recipe)
    expect(list).not.toContain('Score the rind')
  })
})