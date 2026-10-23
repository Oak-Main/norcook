import { describe, expect, it } from 'vitest'

import { RECIPES } from '@/lib/recipes'
import { getRecipeSafety } from '@/lib/recipe-safety'
import { adaptNorcookRecipe } from '@/lib/cooking/adapters/norcook'
import { buildShoppingList } from '@/lib/cooking'
import type { CookingPacket } from '@/lib/cooking'

/**
 * Walks every published Norcook recipe.
 *
 * This is the test that would fail if recipe wording changed, if a line were
 * dropped, if ingredient order shifted, or if a recipe stopped adapting. It runs
 * against the real data the site publishes, not fixtures.
 */

const PACKETS: { recipe: (typeof RECIPES)[number]; packet: CookingPacket }[] =
  RECIPES.map((recipe) => {
    const result = adaptNorcookRecipe({
      slug: recipe.slug,
      name: recipe.name,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
    })
    if (!result.supported) {
      throw new Error(
        `recipe "${recipe.slug}" adapted as unsupported: ${result.reason}`,
      )
    }
    return { recipe, packet: result.packet }
  })

describe('every published Norcook recipe adapts', () => {
  it('covers the whole 77-recipe index', () => {
    expect(RECIPES).toHaveLength(77)
    expect(PACKETS).toHaveLength(77)
  })

  it('gives every packet a unique, non-empty revision', () => {
    const revisions = PACKETS.map((entry) => entry.packet.revision)
    expect(new Set(revisions).size).toBe(revisions.length)
    expect(revisions.every((r) => /^r-[0-9a-f]{32}$/.test(r))).toBe(true)
  })
})

describe('no editorial text is lost', () => {
  it('reproduces every ingredient line, in order, byte-for-byte', () => {
    for (const { recipe, packet } of PACKETS) {
      const authored = recipe.ingredients ?? []
      const adapted = packet.groups.flatMap((group) =>
        group.items.map((item) => item.text),
      )
      expect(adapted, `ingredients drifted for ${recipe.slug}`).toEqual(authored)
    }
  })

  it('reproduces every step, in order, byte-for-byte', () => {
    for (const { recipe, packet } of PACKETS) {
      const authored = recipe.steps ?? []
      expect(
        packet.steps.map((step) => step.text),
        `steps drifted for ${recipe.slug}`,
      ).toEqual(authored)
    }
  })

  it('loses no ingredient character in total', () => {
    for (const { recipe, packet } of PACKETS) {
      const authoredChars = (recipe.ingredients ?? []).join('').length
      const adaptedChars = packet.groups
        .flatMap((group) => group.items.map((item) => item.text))
        .join('').length
      expect(adaptedChars, `ingredient characters lost for ${recipe.slug}`).toBe(
        authoredChars,
      )
    }
  })

  it('loses no step character in total', () => {
    for (const { recipe, packet } of PACKETS) {
      const authoredChars = (recipe.steps ?? []).join('').length
      const adaptedChars = packet.steps.map((step) => step.text).join('').length
      expect(adaptedChars, `step characters lost for ${recipe.slug}`).toBe(
        authoredChars,
      )
    }
  })
})

describe('structured data the page still publishes is untouched', () => {
  it('keeps the recipe name as the packet title', () => {
    for (const { recipe, packet } of PACKETS) {
      expect(packet.title).toBe(recipe.name)
    }
  })

  it('never invents a quantity or a scalable line', () => {
    for (const { packet } of PACKETS) {
      for (const group of packet.groups) {
        for (const item of group.items) {
          expect(item.quantity).toBeNull()
          expect(item.scalable).toBe(false)
          expect(item.prep).toBeNull()
        }
      }
    }
  })

  it('reports scaling unavailable for all 77 packets', () => {
    for (const { packet } of PACKETS) {
      expect(packet.scaling.available, `${packet.recipeId} claims scaling`).toBe(false)
    }
  })

  it('produces step ids that are unique within a packet', () => {
    for (const { packet } of PACKETS) {
      const ids = packet.steps.map((step) => step.id)
      expect(new Set(ids).size, `${packet.recipeId} has duplicate step ids`).toBe(
        ids.length,
      )
    }
  })
})

describe('shopping list covers every published ingredient', () => {
  it('includes each authored line as its own entry', () => {
    for (const { recipe, packet } of PACKETS) {
      const list = buildShoppingList(packet, { source: 'norcook.app' })
      for (const line of recipe.ingredients ?? []) {
        expect(list, `missing "${line}" for ${recipe.slug}`).toContain(`• ${line}`)
      }
    }
  })

  it('emits exactly one bullet per authored ingredient across the whole site', () => {
    const totalAuthored = RECIPES.reduce(
      (sum, recipe) => sum + (recipe.ingredients ?? []).length,
      0,
    )
    const totalBullets = PACKETS.reduce((sum, { packet }) => {
      const list = buildShoppingList(packet)
      return sum + list.split('\n').filter((line) => line.startsWith('• ')).length
    }, 0)

    expect(totalBullets).toBe(totalAuthored)
  })
})

describe('authored sub-list groupings are real in this corpus', () => {
  it('finds the groupings the adapter is built around', () => {
    const grouped = PACKETS.filter((entry) => entry.packet.groups.length > 1)
    expect(grouped.length).toBeGreaterThan(0)

    const titles = new Set(
      grouped.flatMap((entry) =>
        entry.packet.groups.map((group) => group.title).filter(Boolean) as string[],
      ),
    )
    // Sampled from the published corpus; a regression here means grouping broke.
    expect(titles.has('For the filling')).toBe(true)
    expect(titles.has('For the gravy')).toBe(true)
  })
})

describe('safety records are unaffected by the cook companion', () => {
  it('leaves every safety callout reachable by slug', () => {
    const safetySlugs = [
      'fenalar',
      'gravlaks',
      'rokt-roye',
      'spekemat',
      'sursild',
      'rakfisk',
    ]
    for (const slug of safetySlugs) {
      const recipe = RECIPES.find((entry) => entry.slug === slug)
      expect(recipe, `missing recipe ${slug}`).toBeDefined()
      const safety = getRecipeSafety(slug)
      expect(safety, `missing safety record ${slug}`).toBeDefined()
      expect(safety.safeguards.length).toBeGreaterThan(0)
      expect(safety.sources.length).toBeGreaterThan(0)
    }
  })

  it('keeps the pending-review status on every safety record', () => {
    for (const slug of [
      'fenalar',
      'gravlaks',
      'rokt-roye',
      'spekemat',
      'sursild',
      'rakfisk',
    ]) {
      expect(getRecipeSafety(slug).status).toBe('Qualified reviewer pending')
    }
  })
})