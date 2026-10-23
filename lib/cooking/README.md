# Cooking companion — data contract and lifecycle

The cooking companion turns a recipe packet into a guided cooking session:
check off ingredients, move through steps, focus on one, copy a shopping list,
print, and keep progress on the device.

This document is the contract. It is written for whoever picks the work up next
— including on a site that is not Norcook.

## What is real today

| Area | Status |
| --- | --- |
| Norcook adapter, core, UI, print, persistence | **Implemented and tested** in `Oak-Main/norcook` |
| Eatfriete adapter | **Worked example. Not integrated, not tested in Eatfriete.** |
| Scaling UI | **Deliberately unavailable.** See [Scaling](#scaling). |
| Any other site | Not started. This document is the input to that work. |

## Layout

```
lib/cooking/
  types.ts              the contract (no React, no DOM, no I/O)
  hash.ts               deterministic change detector (not a security primitive)
  ids.ts                id derivation rules
  revision.ts           content revision fingerprints
  shopping-list.ts      verbatim list rendering
  scaling.ts            scaling gate + formatting
  persistence.ts        device-local storage
  session.ts            pure progress transitions
  boot.ts               'use client' external-store read of stored progress
  adapters/
    norcook.ts          the one live adapter
    eatfriete.example.ts   worked example, not integrated

components/cook/cook-recipe-body.tsx   the UI (React, client)
components/recipe-plain-body.tsx       the unsupported fallback
app/cook.css                           screen styles + @media print
```

Only `boot.ts` is a client module. Everything else in `lib/cooking` is
framework-independent and runs unchanged in a server component, a plain Node
script, an Astro build step or a test.

## Lifecycle

1. **Adapt.** An adapter turns a site packet into a `CookingPacket`, or returns
   `{ supported: false, reason }`. The caller must then render the ordinary
   recipe view. Not adapting is a supported outcome, not a failure.
2. **Load.** `getBoot(packet)` reads device-local progress exactly once, keyed by
   site, recipe and content revision, and classifies it as `empty`, `restored`,
   `stale`, `unavailable` or `corrupt`.
3. **Render.** Groups and steps are rendered verbatim, in order.
4. **Mutate.** Interactions produce a new `ProgressState` through the pure
   functions in `session.ts`.
5. **Save.** `saveProgress` writes immediately and sanitises against the packet's
   own ids. Failures are reported, never thrown.

There is deliberately **no persistence effect**. Storage is written from the
interaction that caused the change, so a freshly mounted panel can never write an
empty state over progress it has not read yet.

## The contract

```ts
type CookingPacket = {
  siteId: string            // scopes stored progress
  recipeId: string          // stable within a site
  revision: string          // changes when published content changes
  title: string
  groups: IngredientGroup[] // ordered; may be empty
  steps: RecipeStep[]       // ordered, never empty when supported
  scaling: ScalingCapability
}
```

Two rules govern every field.

**Authored text is never rewritten.** `IngredientItem.text` and `RecipeStep.text`
are the exact strings the site publishes — no normalisation, no unit parsing, no
reordering, no truncation.

**Structure is never invented.** A field is populated only when the source packet
authors it. Anything the source does not state stays `null` and is surfaced as
unknown.

### Ids

Prefer an explicit authored id. When the source authors none, ids are derived
**positionally** (`d:ing:<group>:<index>`, `d:step:<order>`) rather than from
content, because an authored rewording must not orphan stored progress. Content
change is the revision's job, not the id's.

Positional ids also cannot collide when two ingredients share wording — which
matters, because two identical lines are two real shopping items.

### Revision

`computeRevision` fingerprints the packet title, every group heading, every
ingredient line and every step text. Presentation concerns are excluded, so
re-serialising a packet cannot silently invalidate progress.

The revision is **not** a security primitive and the hash is not collision-proof
against a motivated attacker. It is a change detector for local storage.

### Unsupported packets

A packet without usable steps, or without a stable id, adapts to
`{ supported: false }`. `components/recipe-plain-body.tsx` is the ordinary recipe
view used in that case: complete, readable, printable, no controls. It is
exercised directly by tests rather than left as unreachable markup.

## Scaling

Scaling is gated on three independent preconditions, all of which must be
authored:

1. an original yield,
2. structured quantities on ingredient lines,
3. an explicit per-line opt-in (`scalable: true`).

**Norcook authors none of the three.** Its ingredient lines are finished editorial
prose — `500 g strong wheat flour`, `For the filling: 100 g butter, 100 g brown
sugar, 2 tbsp cinnamon` — and parsing a quantity out of that would mean guessing
where the unit ends. So every Norcook packet reports
`{ available: false, reason }`, and the panel shows the reason instead of offering
a control.

This is a deliberate result, not a gap. The gate and the formatting helpers are
implemented and unit-tested against fixtures that *do* qualify, so the next site
that authors yield and quantities gets scaling without reimplementing it.

Never scaled, under any multiplier, in any packet:

- equipment dimensions, temperatures, durations
- any number inside an instruction sentence
- safety-critical and non-linear processes (curing, fermenting, pressure, candy)

Instruction steps are therefore **never** scaled. `RecipeStep.scalable` records
the decision; no multiplier is applied to step text anywhere.

## Shopping list

A verbatim transcription, not a computed list. Lines are never merged and units
are never combined — indeed, nothing in the module parses a unit out of a line, so
there is no code path that could add grams to millilitres. Preparation qualifiers,
unknown quantities and authored sub-list wording all survive untouched.

## Storage

Key: `norcook:cook:v1:<siteId>:<recipeId>`. The revision lives in the **value**,
not the key, because a revision change must be *detected* in order to offer a
reset, not merely missed.

Progress is stored in this browser on this device only. Nothing is uploaded, and
clearing browser data removes it. The panel states this on every recipe.

| Result | Meaning | What the UI does |
| --- | --- | --- |
| `restored` | Matches this revision | Progress applied |
| `stale` | Written against another revision | **Not applied.** Offers "Start fresh" |
| `unavailable` | Storage blocked or failing | Controls keep working in memory |
| `corrupt` | Unreadable or unknown schema | Discarded silently |
| `empty` | Nothing stored | Nothing shown |

`sanitizeProgress` is the anti-leak boundary: any id the current packet does not
contain is dropped on both read and write, so a hand-edited value, a restored
backup or a key collision cannot mark a step complete that the cook never
reached.

## Adapting another site

1. Implement `PacketAdapter<TSource>`. Take the site's own recipe type
   structurally so the adapter stays independent of the site's data module.
2. Return `supported: false` whenever you cannot faithfully represent the recipe.
   The fallback view already exists.
3. Pass authored ids through. Only derive when the source authors none.
4. Do not parse prose into quantities. If the site publishes yield and measured
   amounts, author them as fields; otherwise leave `quantity: null`.
5. Return notes for anything the cook should know: duplicated lines, derived
   groupings, missing fields.
6. For Eatfriete specifically, read
   [`adapters/eatfriete.example.ts`](adapters/eatfriete.example.ts) first.

## Printing

Print rules live in `app/cook.css`. Two invariants are load-bearing and are
covered by both a unit test and the Playwright print suite:

- **Hiding a control never hides content.** Checkbox inputs and buttons are
  removed; the authored text beside them stays.
- **Hiding a step on screen never hides it on paper.** Focus mode hides
  non-active steps with a screen rule that the print block explicitly cancels.

The recipe `<h1>`, description and timings live *inside* the hero image overlay,
so the hero is flattened into a plain title block rather than removed — including
forcing its white overlay text to black, or the title prints invisible.

`tests/unit/print-styles.test.ts` asserts the rules are present. It is a
structural guard, not a substitute for the browser suite, which evaluates the
stylesheet for real under `media: print`.