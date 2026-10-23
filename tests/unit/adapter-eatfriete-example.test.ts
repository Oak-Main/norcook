import { describe, expect, it } from 'vitest'

import {
  EATFRIETE_SITE_ID,
  PacketDriftError,
  adaptEatfrietePacket,
  assertPacketInvariants,
  eatfrieteAdapterExample,
  recipeJsonLd,
} from '@/lib/cooking/adapters/eatfriete.example'
import type { EatfrietePacket } from '@/lib/cooking/adapters/eatfriete.example'

/**
 * Eatfriete adapter **example** — contract tests only.
 *
 * These run in Norcook's suite against a fixture that mirrors the real packet
 * shape read from `Oak-Main/eatfriete@74db4862`. They do NOT prove the adapter
 * works in Eatfriete: it is not imported, rendered or built there, and Eatfriete
 * has never been run against it. Nothing here changes Eatfriete's files.
 */

/**
 * Hand-built fixture. Values are copied verbatim from
 * `src/data-packets/belgian-frites.json` in `Oak-Main/eatfriete@74db4862`,
 * trimmed to the fields the adapter reads.
 */
const BELGIAN_FRITES_FIXTURE: EatfrietePacket = {
  meta: {
    site: 'eatfriete',
    slug: 'belgian-frites',
    content_sha256: '5d9d55ff34e55150f71c9cb8a8b980261fcafe7194ea55826423381acd8b1634',
    archetype: 'card-early',
  },
  jsonld: {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: 'Belgian Frites',
    recipeYield: '4',
    recipeIngredient: [
      '1,000 g (2 lb 3 oz) starchy potatoes — Bintje is the canon; Maris Piper or russet are honorable',
      '1,800 g (about 2 L) frying fat: beef tallow for the true frietkot flavor, or peanut/sunflower oil (or half and half — see Chef\'s Note)',
      '6 g fine sea salt',
      '1 egg yolk',
      '150 ml neutral oil, or 100 ml neutral + 50 ml olive',
      '1 tsp Dijon mustard (5 g)',
      '1 tsp (5 g) lemon juice or white wine vinegar',
      '3 g fine salt',
    ],
    recipeInstructions: [
      {
        '@type': 'HowToStep',
        name: 'Step 1',
        text: 'The first fry — cook the potato through. Heat the fat to 140 °C (285 °F) and hold it there.',
      },
      { '@type': 'HowToStep', name: 'Step 2', text: 'Drain, rest, and season.' },
      { '@type': 'HowToStep', name: 'Step 3', text: 'The second fry — colour and crisp.' },
      { '@type': 'HowToStep', name: 'Step 4', text: 'Dress and serve immediately.' },
    ],
  },
  skeleton:
    '<article class="rpc-container" data-rpc="content">' +
    '<figure data-block="hero"><img src="/assets/recipes/frites.png"><figcaption>Belgian Frites</figcaption></figure>' +
    '<figure data-block="step" data-step="1" id="rpc-method"><img src="/assets/recipes/frites.png"><figcaption><strong>Step 1.</strong></figcaption></figure>' +
    '</article>',
}

describe('Eatfriete example — adaptation', () => {
  it('is published as an example and not as an integration', () => {
    // Guards the honesty of the deliverable: renaming this file's status must be
    // a deliberate edit, not an accident.
    expect(eatfrieteAdapterExample.siteId).toBe(EATFRIETE_SITE_ID)
  })

  it('adapts the real packet shape', () => {
    const result = adaptEatfrietePacket(BELGIAN_FRITES_FIXTURE)
    expect(result.supported).toBe(true)
    if (!result.supported) return

    expect(result.packet.siteId).toBe('eatfriete')
    expect(result.packet.recipeId).toBe('belgian-frites')
    expect(result.packet.title).toBe('Belgian Frites')
    expect(result.packet.steps).toHaveLength(4)
    expect(result.packet.groups[0].items).toHaveLength(8)
  })

  it('uses the packet\'s own content_sha256 as the revision', () => {
    const result = adaptEatfrietePacket(BELGIAN_FRITES_FIXTURE)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    expect(result.packet.revision).toBe(
      BELGIAN_FRITES_FIXTURE.meta.content_sha256,
    )
  })

  it('preserves every ingredient line verbatim, including dual units', () => {
    const result = adaptEatfrietePacket(BELGIAN_FRITES_FIXTURE)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    const adapted = result.packet.groups.flatMap((g) => g.items.map((i) => i.text))
    expect(adapted).toEqual(BELGIAN_FRITES_FIXTURE.jsonld.recipeIngredient)
    expect(adapted[0]).toContain('(2 lb 3 oz)')
    expect(adapted[1]).toContain('(about 2 L)')
  })

  it('preserves every instruction verbatim', () => {
    const result = adaptEatfrietePacket(BELGIAN_FRITES_FIXTURE)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    expect(result.packet.steps.map((s) => s.text)).toEqual(
      BELGIAN_FRITES_FIXTURE.jsonld.recipeInstructions!.map((i) => i.text),
    )
  })

  it('refuses to scale prose yields and dual-unit lines', () => {
    const result = adaptEatfrietePacket(BELGIAN_FRITES_FIXTURE)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    expect(result.packet.scaling.available).toBe(false)
    if (result.packet.scaling.available) return
    expect(result.packet.scaling.reason).toMatch(/yield/i)
  })

  it('refuses a packet with no slug', () => {
    const result = adaptEatfrietePacket({
      ...BELGIAN_FRITES_FIXTURE,
      meta: { ...BELGIAN_FRITES_FIXTURE.meta, slug: '' },
    })
    expect(result.supported).toBe(false)
  })

  it('falls back to a locally computed revision when no hash is present', () => {
    const result = adaptEatfrietePacket({
      ...BELGIAN_FRITES_FIXTURE,
      meta: { ...BELGIAN_FRITES_FIXTURE.meta, content_sha256: '' },
    })
    expect(result.supported).toBe(true)
    if (!result.supported) return
    expect(result.packet.revision).toMatch(/^r-[0-9a-f]{32}$/)
  })
})

describe('Eatfriete example — renderer invariants preserved', () => {
  const HERO = '/assets/recipes/frites.png'

  it('passes a correctly rendered body', () => {
    const body = [
      '<figure data-block="hero"><img src="/assets/recipes/frites.png"></figure>',
      '<figure data-block="step" data-step="1"><img src="/assets/recipes/frites.png"></figure>',
    ].join('')
    expect(() => assertPacketInvariants('belgian-frites', body, HERO)).not.toThrow()
  })

  it('still throws on an unresolved asset source', () => {
    expect(() =>
      assertPacketInvariants('belgian-frites', '<p>src="/assets/recipes/"</p>', HERO),
    ).toThrow(PacketDriftError)
  })

  it('still throws on a placeholder caption', () => {
    const body =
      '<figcaption>This image must match the card art</figcaption>' +
      '<figure data-block="step"></figure>' +
      `<img src="${HERO}"><img src="${HERO}">`
    expect(() => assertPacketInvariants('belgian-frites', body, HERO)).toThrow(
      PacketDriftError,
    )
  })

  it('still throws when no step figure is present', () => {
    expect(() =>
      assertPacketInvariants('belgian-frites', `<img src="${HERO}"><img src="${HERO}">`, HERO),
    ).toThrow(PacketDriftError)
  })

  it('still throws when the hero does not appear exactly twice', () => {
    const body = `<figure data-block="step"><img src="${HERO}"></figure>`
    expect(() => assertPacketInvariants('belgian-frites', body, HERO)).toThrow(
      PacketDriftError,
    )
  })

  it('carries the slug in the drift error', () => {
    try {
      assertPacketInvariants('belgian-frites', '<p>nothing</p>', HERO)
      throw new Error('expected a drift error')
    } catch (error) {
      expect(error).toBeInstanceOf(PacketDriftError)
      expect((error as PacketDriftError).message).toMatch(/packet drift: belgian-frites/)
    }
  })
})

describe('Eatfriete example — JSON-LD invariants preserved', () => {
  it('strips aggregateRating exactly as the renderer does', () => {
    const ld = recipeJsonLd(
      {
        ...BELGIAN_FRITES_FIXTURE,
        jsonld: {
          ...BELGIAN_FRITES_FIXTURE.jsonld,
          aggregateRating: { '@type': 'AggregateRating', ratingValue: '5' },
        },
      },
      '/assets/recipes/frites.png',
      'https://eatfriete.com',
    )
    expect(ld.aggregateRating).toBeUndefined()
  })

  it('makes the image absolute without mutating the packet', () => {
    const original = structuredClone(BELGIAN_FRITES_FIXTURE)
    const ld = recipeJsonLd(
      BELGIAN_FRITES_FIXTURE,
      '/assets/recipes/frites.png',
      'https://eatfriete.com',
    )
    expect(ld.image).toEqual(['https://eatfriete.com/assets/recipes/frites.png'])
    expect(BELGIAN_FRITES_FIXTURE).toEqual(original)
  })

  it('leaves an already-absolute image alone', () => {
    const ld = recipeJsonLd(
      BELGIAN_FRITES_FIXTURE,
      'https://cdn.example/frites.png',
      'https://eatfriete.com',
    )
    expect(ld.image).toEqual(['https://cdn.example/frites.png'])
  })
})