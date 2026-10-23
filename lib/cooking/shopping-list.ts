/**
 * Shopping-list rendering.
 *
 * The shopping list is a **verbatim transcription**, not a computed list. Three
 * consequences follow, and all three are deliberate:
 *
 * - Authored ingredient lines are copied exactly, so preparation qualifiers
 *   ("thinly sliced", "to serve"), unknown quantities ("pinch of salt") and any
 *   authored sub-group wording all survive untouched.
 * - Lines are never merged. Two entries with the same wording stay two lines,
 *   because they are two real items to buy.
 * - Units are never combined. Nothing here parses "500 g" out of a line, so
 *   there is no code path that could add grams to millilitres or round a
 *   fraction into the wrong unit.
 *
 * Group headings are preserved and lines are emitted beneath their own heading,
 * in authored order.
 */

import type { CookingPacket, IngredientGroup } from './types'

export type ShoppingListOptions = {
  /** Shown as a plain-text heading. Defaults to the packet title. */
  title?: string
  /** Appended under the heading, e.g. the site name. */
  source?: string
}

/** Bullet character used for every line, regardless of authored leading punctuation. */
const BULLET = '• '

function renderGroup(group: IngredientGroup, lines: string[]): void {
  if (group.title) lines.push(group.title)
  for (const item of group.items) {
    // The full authored line, including any prefix the group title was taken
    // from, is emitted verbatim. Nothing is stripped.
    lines.push(`${BULLET}${item.text}`)
  }
}

/**
 * Builds the plain-text shopping list for `packet`.
 *
 * Deterministic and pure: the same packet always produces byte-identical text,
 * which is what lets the copy action be verified in tests.
 */
export function buildShoppingList(
  packet: CookingPacket,
  options: ShoppingListOptions = {},
): string {
  const lines: string[] = []
  lines.push(options.title ?? packet.title)
  if (options.source) {
    lines.push(options.source)
    lines.push('')
  }
  lines.push('INGREDIENTS')
  lines.push('')

  if (packet.groups.length === 0) {
    lines.push('(no ingredient list published for this recipe)')
  } else {
    packet.groups.forEach((group) => renderGroup(group, lines))
  }

  return lines.join('\n')
}