/**
 * Cooking companion adapter contract.
 *
 * This module is deliberately framework-independent and dependency-free: it must
 * stay importable from a server component, a client component, a plain Node
 * script and an Astro build step alike. It contains no React, no DOM access and
 * no I/O.
 *
 * Two rules govern every field in this file.
 *
 * 1. **Authored text is never rewritten.** `IngredientItem.text` and
 *    `RecipeStep.text` are the exact strings the site publishes. No
 *    normalisation, no unit parsing, no reordering, no truncation.
 * 2. **Structure is never invented.** A field is populated only when the source
 *    packet authors it. Anything the source does not state stays `null` and is
 *    surfaced as unknown. See `Quantity` and `ScalingCapability`.
 */

/** Identifies the site a packet came from. Part of the progress storage key. */
export type SiteId = string

/**
 * A structured quantity, used only when the source packet authors machine
 * readable numbers. Prose such as "500 g strong wheat flour" is **not** parsed
 * into this shape: inferring a quantity from prose would fabricate data on a
 * site where quantities are food-safety relevant.
 */
export type Quantity = {
  amount: number
  unit: string
}

/**
 * A single ingredient line.
 *
 * `text` is authoritative and complete. `prep` and `quantity` are optional
 * author-supplied enrichments that may be `null` even when the line is present.
 */
export type IngredientItem = {
  /**
   * Stable within a packet revision and across reloads. Prefer an explicit id
   * authored by the source; adapters without one derive a deterministic,
   * collision-proof positional id (see `deriveItemId`).
   */
  id: string
  /** Verbatim authored line, including any preparation qualifier. */
  text: string
  /** Verbatim preparation qualifier when the source separates one. `null` otherwise. */
  prep: string | null
  /** Structured quantity when the source authors one. `null` means unknown. */
  quantity: Quantity | null
  /**
   * Author opt-in permitting scaling of this line. Defaults to `false`.
   * Scaling refuses to run unless an adapter explicitly opts a line in.
   */
  scalable: boolean
}

/** An ordered group of ingredients. Groups render in array order. */
export type IngredientGroup = {
  id: string
  /** Authored heading, or `null` for an unheaded run of lines. */
  title: string | null
  items: IngredientItem[]
}

/** One ordered instruction. `order` is 1-based and must equal array position + 1. */
export type RecipeStep = {
  id: string
  order: number
  /** Verbatim authored instruction. Never rewritten. */
  text: string
  /** Author opt-in permitting scaling. Defaults to `false`. */
  scalable: boolean
}

/**
 * Whether a packet may be scaled, and why not when it may not.
 *
 * Scaling is gated on three independent preconditions — an original yield,
 * structured quantities, and authored per-line opt-in. A packet missing any one
 * of them reports `available: false` with a human-readable reason rather than
 * offering a control that would produce wrong numbers.
 */
export type ScalingCapability =
  | {
      available: true
      /** The original, as authored. Always displayed alongside any multiplier. */
      originalYield: Quantity
      /** Multipliers an adapter has decided are safe to offer. */
      multipliers: number[]
    }
  | { available: false; reason: string }

/** The normalised packet the cook companion renders. */
export type CookingPacket = {
  siteId: SiteId
  /** Stable recipe identity, unique within `siteId`. */
  recipeId: string
  /**
   * Content revision. Changes whenever published recipe content changes, and is
   * what makes stale local progress detectable. See `computeRevision`.
   */
  revision: string
  title: string
  /** Ordered ingredient groups. May be empty when a packet authors none. */
  groups: IngredientGroup[]
  /** Ordered steps. Never empty for a supported packet. */
  steps: RecipeStep[]
  scaling: ScalingCapability
}

/** Non-fatal observation recorded while adapting. Surfaced, never swallowed. */
export type AdapterNote = {
  code:
    | 'grouped-ingredients'
    | 'duplicate-ingredient-text'
    | 'empty-ingredients'
    | 'derived-ids'
    | 'quantity-unknown'
  message: string
}

/**
 * Result of adapting one source packet.
 *
 * `supported: false` is a supported outcome, not a failure. The caller must
 * fall back to the ordinary recipe view so the recipe stays readable.
 */
export type AdaptationResult =
  | { supported: true; packet: CookingPacket; notes: AdapterNote[] }
  | { supported: false; reason: string }

/** The contract every site adapter implements. */
export interface PacketAdapter<TSource> {
  readonly siteId: SiteId
  adapt(source: TSource): AdaptationResult
}