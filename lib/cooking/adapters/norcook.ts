/**
 * Norcook packet adapter.
 *
 * Adapts the site's existing `Recipe` records (see `lib/recipes.ts` and
 * `lib/recipe-details.ts`) into a `CookingPacket`. It is the only adapter wired
 * into a live route in this pilot.
 *
 * Source shape actually present in the repo
 * -----------------------------------------
 * Norcook authors ingredients as a flat array of finished editorial strings and
 * steps as a flat array of finished instruction strings. It has no ingredient
 * groups, no line ids, no yield field, no structured quantities and no
 * per-line scaling opt-in. All 77 recipes carry both arrays.
 *
 * What this adapter does and does not derive
 * -------------------------------------------
 *
 * - **Groups**: derived from an *authored* signal only. Lines beginning
 *   "For the filling:", "For the gravy:", "To serve:" and similar are how the
 *   site's own copy already marks sub-lists. The heading is taken verbatim from
 *   that prefix and the **full original line is preserved verbatim** as the item
 *   text, so nothing is stripped when the grouping is used. Real data contains
 *   18 distinct such prefixes across the 77 recipes.
 * - **Ids**: derived positionally, because the source authors none. Positional
 *   ids stay stable across a reload and across a rewording, and they cannot
 *   collide when two ingredients share the same wording.
 * - **Quantities**: `null`, always. "500 g strong wheat flour" is not parsed into
 *   `{ amount: 500, unit: 'g' }`, because a parser would have to guess where the
 *   unit ends in lines such as "For the sauce: 3 tbsp Dijon, 1 tbsp sugar".
 *   Invented structure on a recipe site is a worse failure than absent structure.
 * - **Scaling**: unavailable for every Norcook packet, and reported with the
 *   reason rather than hidden.
 *
 * Unsupported packets
 * ------------------
 * A packet with no usable steps adapts to `{ supported: false }`. The caller
 * falls back to the ordinary recipe view, so such a recipe is still readable,
 * printable and indexable. Norcook's live data never hits this path; the edge
 * case is exercised by fixtures in `tests/unit`.
 */

import { computeRevision } from '../revision'
import { deriveGroupId, deriveItemId, deriveStepId } from '../ids'
import { assessScaling } from '../scaling'
import type {
  AdaptationResult,
  AdapterNote,
  CookingPacket,
  IngredientGroup,
  PacketAdapter,
  Quantity,
} from '../types'

/** Storage-key namespace. Matches the site's domain identity. */
export const NORCOOK_SITE_ID = 'norcook'

/**
 * The structural subset of `lib/recipes.ts`'s `Recipe` this adapter needs.
 *
 * Declared structurally rather than imported so the adapter stays free of any
 * dependency on the site's data module, and so a test can exercise it with a
 * minimal fixture.
 */
export type NorcookRecipeSource = {
  slug: string
  name: string
  ingredients?: string[]
  steps?: string[]
}

/**
 * An authored sub-list heading.
 *
 * Matches the prefixes present in the current corpus: "For the filling",
 * "For the sauce", "For the gravy", "For the icing", "For serving",
 * "For the mash", "For the butter sauce", "For the white sauce",
 * "For the cucumber salad", "For the apples", "For the coating",
 * "For the sponge", "For the meringue", "For the glaze", "For the topping",
 * "For the spice mix", "For the scrambled eggs", "To serve".
 *
 * Two constraints keep this from misfiring on ordinary prose: the colon must
 * appear within 60 characters of the start, and a non-space character must
 * follow it. A line such as "Sour cream, strawberry jam and brown cheese, to
 * serve" has no colon and is never treated as a heading.
 */
const GROUP_HEADING = /^((?:For|To make|To serve)\b[^:]{0,60}):\s*\S/

/** Builds ingredient groups in authored order, preserving every line verbatim. */
function buildGroups(ingredients: string[]): IngredientGroup[] {
  type Draft = { title: string | null; items: string[] }
  const drafts: Draft[] = [{ title: null, items: [] }]

  for (const line of ingredients) {
    if (line.trim().length === 0) continue
    const heading = GROUP_HEADING.exec(line)
    if (heading) {
      drafts.push({ title: heading[1], items: [] })
    }
    // Always the full original line, so the authored prefix stays in the text
    // that reaches the cook and the shopping list.
    drafts[drafts.length - 1].items.push(line)
  }

  // Drop empty drafts (an unheaded group emptied by the first line being a
  // heading) and assign contiguous, deterministic ids from the final positions.
  return drafts
    .filter((draft) => draft.items.length > 0)
    .map((draft, groupIndex) => ({
      id: deriveGroupId(groupIndex),
      title: draft.title,
      items: draft.items.map((line, itemIndex) => ({
        id: deriveItemId(groupIndex, itemIndex),
        text: line,
        prep: null,
        quantity: null,
        // Norcook authors no scaling opt-in, so every line is pinned to its
        // written amount. This is what keeps scaling switched off sitewide.
        scalable: false,
      })),
    }))
}

function buildSteps(steps: string[]) {
  return steps
    .map((text, index) => ({ text, index }))
    .filter((entry) => entry.text.trim().length > 0)
    .map((entry, position) => ({
      id: deriveStepId(position + 1),
      order: position + 1,
      text: entry.text,
      // Instruction text is never scaled, so this stays false by construction.
      scalable: false,
    }))
}

function collectNotes(
  groups: IngredientGroup[],
  ingredientCount: number,
  steps: number,
): AdapterNote[] {
  const notes: AdapterNote[] = [
    {
      code: 'derived-ids',
      message:
        'Norcook authors no line ids, so ingredient and step ids are derived from position.',
    },
    {
      code: 'quantity-unknown',
      message:
        'Ingredient quantities are prose, not measured values, and are never converted into numbers.',
    },
  ]

  if (groups.length > 1) {
    notes.push({
      code: 'grouped-ingredients',
      message: `Ingredients were split into ${groups.length} groups using authored sub-list headings.`,
    })
  } else if (ingredientCount === 0) {
    notes.push({
      code: 'empty-ingredients',
      message: 'No ingredient list is published for this recipe.',
    })
  }

  const seen = new Set<string>()
  let duplicates = 0
  for (const group of groups) {
    for (const item of group.items) {
      if (seen.has(item.text)) duplicates += 1
      seen.add(item.text)
    }
  }
  if (duplicates > 0) {
    notes.push({
      code: 'duplicate-ingredient-text',
      message: `${duplicates} ingredient line(s) repeat earlier wording and are kept separate.`,
    })
  }

  if (steps === 0) {
    notes.push({
      code: 'empty-ingredients',
      message: 'No usable instruction steps were found.',
    })
  }

  return notes
}

/**
 * Adapts one Norcook recipe.
 *
 * Pure and total: no I/O, no React, no DOM. Safe to call during a server
 * render, in a test, or in a build script.
 */
export function adaptNorcookRecipe(
  source: NorcookRecipeSource,
  options: { yield?: Quantity | null } = {},
): AdaptationResult {
  if (!source || typeof source.slug !== 'string' || source.slug.length === 0) {
    return { supported: false, reason: 'Recipe has no stable slug to identify it.' }
  }

  const stepEntries = Array.isArray(source.steps) ? source.steps : []
  const steps = buildSteps(stepEntries)
  if (steps.length === 0) {
    return {
      supported: false,
      reason: 'This recipe publishes no usable instruction steps.',
    }
  }

  const ingredientEntries = Array.isArray(source.ingredients) ? source.ingredients : []
  const groups = buildGroups(ingredientEntries)

  const packet: CookingPacket = {
    siteId: NORCOOK_SITE_ID,
    recipeId: source.slug,
    revision: '',
    title: typeof source.name === 'string' ? source.name : source.slug,
    groups,
    steps,
    scaling: assessScaling({ yield: options.yield ?? null, groups }),
  }
  packet.revision = computeRevision({
    title: packet.title,
    groups: packet.groups,
    steps: packet.steps,
  })

  return {
    supported: true,
    packet,
    notes: collectNotes(groups, ingredientEntries.length, steps.length),
  }
}

/** The adapter object form, for registries that hold adapters generically. */
export const norcookAdapter: PacketAdapter<NorcookRecipeSource> = {
  siteId: NORCOOK_SITE_ID,
  adapt: adaptNorcookRecipe,
}