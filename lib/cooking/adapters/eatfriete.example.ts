/**
 * Eatfriete packet adapter — **worked example, not integrated**.
 *
 * ---------------------------------------------------------------------------
 * STATUS: NOT INTEGRATED. NOT TESTED IN ITS OWN REPO. DO NOT DEPLOY.
 * ---------------------------------------------------------------------------
 *
 * No Eatfriete code imports this file, no Eatfriete page renders it, and no
 * Eatfriete build or test run exercises it. It was written by reading Eatfriete
 * source and is exercised here only by Norcook's own unit tests against a
 * fixture. It is a reference for whoever picks up the integration, nothing more.
 *
 * Eatfriete is an **Astro** static site; Norcook is **Next.js**. They share no
 * framework, no component model and no routing. This example therefore reads the
 * packet as plain JSON and depends on nothing from either site.
 *
 * Sources read to produce this file
 * ---------------------------------
 * - `Oak-Main/eatfriete` @ `74db4862` (2026-10-04)
 *   - `src/lib/packet-render.ts`        — renderer and drift invariants
 *   - `src/data-packets/*.json`         — packet shape (6 packets)
 *   - `src/pages/recipes/[slug].astro`  — consumer
 *
 * What the real packets actually contain
 * --------------------------------------
 * - `meta.site`            "eatfriete"
 * - `meta.slug`            e.g. "belgian-frites"
 * - `meta.content_sha256`  a real upstream content hash — the correct revision
 *                          source, better than any locally computed one
 * - `jsonld.recipeIngredient`    prose strings with dual and approximate units:
 *                          "1,000 g (2 lb 3 oz) starchy potatoes",
 *                          "1,800 g (about 2 L) frying fat"
 * - `jsonld.recipeInstructions`  `{ "@type": "HowToStep", name, text }[]`
 * - `jsonld.recipeYield`         **prose**, not a number: "4", "6",
 *                          "Makes 8 waffles", "Makes about 30 cookies"
 * - `skeleton`              the rendered HTML, with `data-block="step"` figures
 *                          carrying `data-step="N"`
 *
 * Why scaling stays off for every Eatfriete packet
 * ------------------------------------------------
 * `recipeYield` is prose in three of six packets, and ingredient lines carry
 * dual units ("g" alongside "lb 3 oz") or approximations ("about 2 L"). A
 * multiplier would have to choose a unit system, re-derive the other, and round
 * an approximation — inventing numbers the site never published. The gate in
 * `../scaling` refuses these packets for exactly that reason, and this adapter
 * passes the raw yield string through as `null` rather than parsing it.
 *
 * Invariants this example must not weaken
 * ----------------------------------------
 * `packet-render.ts` throws `packet drift: <slug>` when, after its HTML
 * transforms, the body still contains an unresolved `/assets/recipes/` source,
 * a "must match the card" caption, no `data-block="step"` figure, or a hero
 * image that does not appear exactly twice. It also strips `aggregateRating`
 * from the JSON-LD it emits. Those rules belong to Eatfriete's publish gate.
 * This adapter **reproduces** them as assertions so an integrator cannot add a
 * cook companion in a way that quietly relaxes them, and it never calls the
 * renderer or rewrites its output.
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

export const EATFRIETE_SITE_ID = 'eatfriete'

/**
 * Structural mirror of an Eatfriete data packet. Declared here rather than
 * imported because the packet lives in another repository; keep it in step with
 * `src/data-packets/*.json` when integrating.
 */
export type EatfrietePacket = {
  meta: {
    site: string
    slug: string
    content_sha256: string
    archetype?: string
    recipe_path?: string
    [key: string]: unknown
  }
  jsonld: {
    '@type'?: string
    name?: string
    recipeIngredient?: string[]
    recipeInstructions?: { '@type'?: string; name?: string; text?: string }[]
    recipeYield?: string
    [key: string]: unknown
  }
  skeleton: string
  [key: string]: unknown
}

/** Raised when an Eatfriete packet fails one of the renderer's own invariants. */
export class PacketDriftError extends Error {
  readonly slug: string
  constructor(slug: string, detail: string) {
    super(`packet drift: ${slug} (${detail})`)
    this.name = 'PacketDriftError'
    this.slug = slug
  }
}

/**
 * Reproduces the post-transform drift checks from `packet-render.ts`.
 *
 * Mirrors lines 24–28 of that file. Called against the **rendered** body, so it
 * must run after `renderPacketArticle`, never before.
 */
export function assertPacketInvariants(
  slug: string,
  renderedBody: string,
  heroSrc: string,
): void {
  if (renderedBody.includes('src="/assets/recipes/"')) {
    throw new PacketDriftError(slug, 'unresolved recipe asset source')
  }
  if (/<figcaption>[^<]*must match the card/i.test(renderedBody)) {
    throw new PacketDriftError(slug, 'placeholder caption left in card figure')
  }
  if (!/<figure data-block="step"/.test(renderedBody)) {
    throw new PacketDriftError(slug, 'no step figure present')
  }
  const heroHits = renderedBody.split(heroSrc).length - 1
  if (heroHits !== 2) {
    throw new PacketDriftError(slug, `hero appears ${heroHits} times, expected 2`)
  }
}

/**
 * Mirrors `packetJsonld` from `packet-render.ts`: shallow copy, absolute image,
 * `aggregateRating` removed.
 *
 * An integration must feed the cook companion from this shape, never from the
 * raw `packet.jsonld`, so the adapter can never reintroduce an
 * `aggregateRating` the publish gate deliberately strips.
 */
export function recipeJsonLd(
  packet: EatfrietePacket,
  heroSrc: string,
  origin: string,
): Record<string, unknown> {
  const ld: Record<string, unknown> = { ...packet.jsonld }
  ld.image = [heroSrc.startsWith('http') ? heroSrc : origin + heroSrc]
  delete ld.aggregateRating
  return ld
}

/**
 * `recipeYield` is prose in three of six real packets, so it is not parsed into
 * a `Quantity`. Returning `null` is what keeps scaling unavailable.
 */
function authoredYield(packet: EatfrietePacket): Quantity | null {
  void packet
  return null
}

function buildGroups(ingredients: string[]): IngredientGroup[] {
  return [
    {
      id: deriveGroupId(0),
      title: null,
      items: ingredients
        .filter((line) => typeof line === 'string' && line.trim().length > 0)
        .map((line, itemIndex) => ({
          id: deriveItemId(0, itemIndex),
          text: line,
          prep: null,
          quantity: null,
          scalable: false,
        })),
    },
  ].filter((group) => group.items.length > 0)
}

function buildSteps(
  instructions: { name?: string; text?: string }[],
): { id: string; order: number; text: string; scalable: boolean }[] {
  return instructions
    .map((instruction, index) => ({ instruction, index }))
    .filter((entry) => (entry.instruction.text ?? '').trim().length > 0)
    .map((entry, position) => ({
      id: deriveStepId(position + 1),
      order: position + 1,
      text: entry.instruction.text as string,
      scalable: false,
    }))
}

/**
 * Adapts one Eatfriete packet. **Example only — see the status banner above.**
 */
export function adaptEatfrietePacket(packet: EatfrietePacket): AdaptationResult {
  const slug = packet?.meta?.slug
  if (typeof slug !== 'string' || slug.length === 0) {
    return { supported: false, reason: 'Packet has no stable slug to identify it.' }
  }

  const instructions = Array.isArray(packet.jsonld?.recipeInstructions)
    ? packet.jsonld.recipeInstructions
    : []
  const steps = buildSteps(instructions)
  if (steps.length === 0) {
    return { supported: false, reason: 'This packet publishes no usable method steps.' }
  }

  const ingredients = Array.isArray(packet.jsonld?.recipeIngredient)
    ? packet.jsonld.recipeIngredient
    : []
  const groups = buildGroups(ingredients)

  const title = typeof packet.jsonld?.name === 'string' ? packet.jsonld.name : slug

  // Prefer the packet's own content hash. Fall back to a locally computed
  // revision only when the hash is absent, and say so in the notes.
  const authoredRevision =
    typeof packet.meta?.content_sha256 === 'string' && packet.meta.content_sha256
      ? packet.meta.content_sha256
      : null

  const localRevision = computeRevision({
    title,
    groups,
    steps,
  })

  const notes: AdapterNote[] = [
    {
      code: 'derived-ids',
      message:
        'Eatfriete packets author no line ids, so ingredient and step ids are derived from position.',
    },
    {
      code: 'quantity-unknown',
      message:
        'Ingredient lines carry dual or approximate units, so they are never converted into numbers and scaling is unavailable.',
    },
  ]
  if (!authoredRevision) {
    notes.push({
      code: 'quantity-unknown',
      message:
        'Packet carries no content_sha256; a locally computed revision was used instead.',
    })
  }

  const result: CookingPacket = {
    siteId: EATFRIETE_SITE_ID,
    recipeId: slug,
    revision: authoredRevision ?? localRevision,
    title,
    groups,
    steps,
    scaling: assessScaling({ yield: authoredYield(packet), groups }),
  }

  return { supported: true, packet: result, notes }
}

/** **Example only.** See the status banner above. */
export const eatfrieteAdapterExample: PacketAdapter<EatfrietePacket> = {
  siteId: EATFRIETE_SITE_ID,
  adapt: adaptEatfrietePacket,
}