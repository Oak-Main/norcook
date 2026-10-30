/**
 * packet-pilot.ts — Wave 0 pilot renderer (Recipe Finalz presentation layer).
 *
 * Serves /recipes/kanelsnurrer from the composed packet instead of the legacy
 * data model: the packet's pre-built skeleton IS the markup-contract HTML
 * (one content container, direct-child data-block elements, sticky jump bar,
 * quantities only in the shared .rpc-card). This module only applies the
 * deployment-time transforms and fails loud on skeleton drift — it never
 * silently ships orphaned markup.
 *
 * Deterministic rebuild of the packet itself:
 *   node scripts/compose-presentation.mjs --all-final --write  (Recipe Finalz)
 */
import packetJson from '../content/packets/kanelsnurrer.json'
import { packetVisualMarkup } from './recipe-visual-markup'

export const PILOT_SLUG = 'kanelsnurrer'
export const PILOT_HERO = '/assets/img/norcook-kanelsnurrer-hero-20261030.webp' // 1200 × 800

/** Project-generated illustration; the caption discloses its origin. */
const ORIGIN = 'https://www.norcook.app'

interface Packet {
  skeleton: string
  jsonld: Record<string, unknown>
  meta: { slug: string }
}

const p = packetJson as unknown as Packet

export function pilotJsonld(): Record<string, unknown> {
  const ld = { ...p.jsonld }
  ld.image = [ORIGIN + PILOT_HERO]
  // Nothing visible to match — never ship crowd data.
  delete ld.aggregateRating
  // The shared governance record has no approved public author yet.
  delete ld.author
  return ld
}

/** Keep the packet's wording; collapse whitespace, never letters. */
export function pilotDescription(): string {
  return String(pilotJsonld().description ?? '').replace(/\s+/g, ' ').trim().slice(0, 185)
}

/** Article HTML for the pilot route; throws on any skeleton drift. */
export function renderPilotArticle(): string {
  let body = p.skeleton
  const heroAlt = 'Glossy cinnamon knots with twisted bands cooling on a rack'
  const heroCap = 'AI-created illustration; your finished bake may differ.'
  const heroImg = `<img src="${PILOT_HERO}" width="1200" height="800" data-recipe-visual="norcook-kanelsnurrer-hero-20261030.webp" style="aspect-ratio:3/2;object-fit:cover" alt="${heroAlt}" fetchpriority="high" decoding="async">`
  body = body.replace(
    /<figure data-block="hero">[\s\S]*?<\/figure>/,
    `<figure data-block="hero">${heroImg}${heroCap ? `<figcaption>${heroCap}</figcaption>` : ''}</figure>`
  )
  body = body.replace(
    /<figure data-shot="CARD"><img[^>]*><\/figure>/,
    `<figure data-shot="CARD"><img src="${PILOT_HERO}" width="1200" height="800" style="aspect-ratio:1/1;object-fit:cover" alt="${heroAlt}" loading="lazy" decoding="async"></figure>`
  )
  // Real-only media: unmapped shot placeholders are stripped as whole tags;
  // shot-slot figures left without an image are removed whole (their captions
  // are composer spec). Steps are figure-wrapped content WITHOUT imgs and
  // must never be touched — cleanup targets data-shot/pre-card-glamour only.
  body = body.replace(/<img src="\/assets\/recipes\/"[^>]*>/g, '')
  body = body.replace(/<figure data-shot="[^"]*"[^>]*>(?:(?!<img[\s\S])[\s\S])*?<\/figure>/g, '')
  body = body.replace(/<figure data-block="pre-card-glamour"[^>]*>(?:(?!<img[\s\S])[\s\S])*?<\/figure>/g, '')
  if (body.includes('src="/assets/recipes/"'))
    throw new Error('pilot packet drift: placeholder survived full-tag strip')
  if (/<figcaption>[^<]*must match the card/i.test(body))
    throw new Error('pilot packet drift: composer spec caption leaked')
  if (!/<figure data-block="step"/.test(body))
    throw new Error('pilot packet drift: step figures missing after cleanup')
  const heroHits = body.split(PILOT_HERO).length - 1
  if (heroHits !== 2)
    throw new Error(`pilot packet drift: expected hero+card twice, got ${heroHits}`)
  // The approved technique micro-video (disclosed-AI, reviewed placement)
  // stays on the page — inserted ahead of the recipe card, where the e2e
  // imageops contract expects it.
  const VIDEO =
    '<figure data-block="technique-video" style="margin:20px 0">' +
    '<video src="/assets/video/technique-micro.mp4" width="1366" height="768" data-imageops-asset="technique-micro.mp4" aria-label="Hands shaping a strip of dough into a knot" controls muted playsInline preload="none" style="width:100%;height:auto"></video>' +
    '<figcaption>AI-created dough-shaping illustration, not a complete recipe demonstration. Follow the written method above.</figcaption>' +
    '</figure>'
  const CARD_ANCHOR = '<section class="rpc-card"'
  if (!body.includes(CARD_ANCHOR))
    throw new Error('pilot packet drift: recipe card anchor missing')
  body = body.replace(CARD_ANCHOR, packetVisualMarkup() + VIDEO + CARD_ANCHOR)
  // Recipe JSON-LD from the packet, after the article per site convention.
  const ld = `<script type="application/ld+json">${JSON.stringify(pilotJsonld()).replace(/</g, '\\u003c')}</script>`
  return body + ld
}

