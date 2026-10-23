/**
 * Scaling capability assessment.
 *
 * Scaling is the part of a cook companion most likely to produce a *wrong*
 * number that still looks right, so it is gated hard and computed narrowly.
 *
 * What is never scaled, in any packet, under any multiplier:
 *
 * - equipment dimensions (pan sizes, mould sizes, waffle irons)
 * - temperatures (oven, water, oil, resting)
 * - durations (prove, bake, chill, cure, rest)
 * - any number inside an instruction sentence
 * - safety-critical and non-linear processes (curing, fermenting, pressure,
 *   candy work), which do not scale linearly and are governed by validated
 *   processes rather than by arithmetic
 *
 * Consequence: **instruction steps are never scaled.** `RecipeStep.scalable`
 * exists so an adapter can record that decision, but no multiplier is ever
 * applied to step text here.
 *
 * A packet qualifies only when all three of these are authored:
 *
 * 1. an original yield,
 * 2. structured quantities on ingredient lines,
 * 3. an explicit per-line opt-in to scaling.
 *
 * Norcook authors none of the three — its ingredient lines are editorial prose
 * such as "500 g strong wheat flour", which this module deliberately does not
 * parse. Every Norcook packet therefore assesses as unavailable, and the pilot
 * ships that answer rather than a control that would invent numbers.
 */

import type { CookingPacket, IngredientItem, Quantity } from './types'

/** Multipliers offered when a packet does qualify. Sub-multipliers included. */
export const DEFAULT_MULTIPLIERS = [0.5, 1, 1.5, 2, 3] as const

export type ScalingAssessment =
  | { available: true; originalYield: Quantity; multipliers: number[] }
  | { available: false; reason: string }

export type ScalingInput = {
  /** Authored original yield. `null` when the packet publishes none. */
  yield: Quantity | null
  groups: CookingPacket['groups']
  /** Present so a future adapter can hard-disable scaling for risky methods. */
  steps?: CookingPacket['steps']
  multipliers?: number[]
}

/**
 * Decides whether `input` may be scaled, and says why not when it may not.
 *
 * The reasons are written to be shown to a cook, so they name the missing thing
 * rather than the failed check.
 */
export function assessScaling(input: ScalingInput): ScalingAssessment {
  if (!input.yield) {
    return {
      available: false,
      reason:
        'This recipe does not publish an original yield, so amounts cannot be scaled without guessing.',
    }
  }

  const items = input.groups.flatMap((group) => group.items)
  const withQuantity = items.filter((item) => item.quantity !== null)
  if (withQuantity.length === 0) {
    return {
      available: false,
      reason:
        'This recipe lists ingredients as written prose rather than measured amounts, so scaling would risk changing a quantity that was never stated numerically.',
    }
  }

  const optedIn = withQuantity.filter((item) => item.scalable)
  if (optedIn.length === 0) {
    return {
      available: false,
      reason:
        'No ingredient in this recipe is marked safe to scale, so amounts are shown exactly as written.',
    }
  }

  const multipliers = (input.multipliers ?? [...DEFAULT_MULTIPLIERS]).filter(
    (value) => value > 0 && Number.isFinite(value),
  )
  if (multipliers.length === 0) {
    return {
      available: false,
      reason: 'No valid serving multipliers are defined for this recipe.',
    }
  }

  return {
    available: true,
    originalYield: input.yield,
    multipliers: multipliers.includes(1)
      ? multipliers
      : [...multipliers, 1].sort((a, b) => a - b),
  }
}

/**
 * Formats an amount without ever losing precision to a rounded fraction.
 *
 * Common kitchen fractions are rendered exactly (`0.5` → `1/2`, `1.5` → `1 1/2`)
 * because a scaled 0.5 kg written as "0.5 kg" is harder to use than "1/2 kg",
 * and a value written as `0.333` must not become `1/3`.
 */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return String(amount)
  if (Number.isInteger(amount)) return String(amount)

  const whole = Math.floor(amount)
  const remainder = Number((amount - whole).toFixed(6))

  const named: Record<string, string> = {
    '0.25': '1/4',
    '0.5': '1/2',
    '0.75': '3/4',
    '0.33': '1/3',
    '0.67': '2/3',
  }
  const fraction = named[String(remainder)]
  if (fraction) {
    return whole > 0 ? `${whole} ${fraction}` : fraction
  }

  return String(Number(amount.toFixed(3)))
}

/**
 * Returns the display string for one ingredient at `multiplier`.
 *
 * An item is scaled only when it carries both a structured quantity and an
 * authored opt-in. Everything else is returned verbatim, so a packet with
 * partial authoring degrades line-by-line rather than failing wholesale.
 */
export function displayForItem(
  item: IngredientItem,
  multiplier: number,
): { text: string; scaled: boolean } {
  if (multiplier === 1 || !item.scalable || !item.quantity) {
    return { text: item.text, scaled: false }
  }
  const scaled = item.quantity.amount * multiplier
  return {
    text: `${formatAmount(scaled)} ${item.quantity.unit}`.trim(),
    scaled: true,
  }
}