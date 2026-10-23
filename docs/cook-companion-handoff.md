# Handoff — Norcook cook companion pilot

**Status:** reviewable pilot, complete. Nothing pushed, merged, deployed or
published. No other site in the portfolio was touched.

| | |
| --- | --- |
| Repository | `Oak-Main/norcook` |
| Branch | `feat/cook-companion-pilot` |
| Commit | `d1574451` |
| Base | `a051960` (`origin/main`) |
| Local worktree | `C:\Users\Dell\norcook-pilot-wt` |
| Final revision | `r-<32 hex>` per recipe, computed from published content |

## Two corrections to the brief

1. **The stated starting point does not exist.** There is no
   `components/packet-print.tsx` in Norcook at `a051960`, no `window.print()`
   call anywhere, and no `@media print` or `@page` rule anywhere.
   `grep -r "window\.print|@media print|@page|beforeprint|afterprint"` over the
   repo returns zero matches. Printing was built from zero rather than extended.

2. **The two sites share no framework.** Norcook is Next.js 16.2.6 + React 19 +
   Tailwind v4. Eatfriete is **Astro**, static output. No shared component model
   was assumed, and the Eatfriete side is a documented example rather than a port.

## Setup and run

```powershell
cd C:\Users\Dell\norcook-pilot-wt

# Node >= 22 and pnpm 11 are already present on this machine.
pnpm install --frozen-lockfile

# Verify everything (see "Gates" below for the one pre-existing failure).
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm check:content
pnpm build
pnpm test:e2e

# Local review entry point.
pnpm build
pnpm start            # http://127.0.0.1:3000
```

Then open:

| Route | What to look at |
| --- | --- |
| <http://127.0.0.1:3000/recipes/skillingsboller> | Grouped ingredients, 6 steps, scaling note |
| <http://127.0.0.1:3000/recipes/gravlaks> | Food-safety callout, 4 steps |
| <http://127.0.0.1:3000/recipes/kransekake> | Temperatures and durations |

To regenerate the review evidence with the server running:

```powershell
node scripts/capture-review-evidence.mjs   # screenshots + print PDFs -> review/
node scripts/capture-print-view.mjs        # print-media visual check
```

## Gates

| Command | Result |
| --- | --- |
| `pnpm lint` | pass — 0 problems at `--max-warnings=0` |
| `pnpm typecheck` | pass |
| `pnpm test:unit` | **139 passed** (9 files, vitest 5.0.5) |
| `pnpm check:content` | pass — 77 recipes, 6 safety records |
| `pnpm check:images` | pass |
| `pnpm build` | pass — 89 static pages, all 77 recipes prerendered |
| `pnpm test:e2e` | **34 passed** — 28 new, 6 pre-existing, zero regressions |
| `pnpm audit:dependencies` | **FAIL — pre-existing, not caused by this work** |

`audit:dependencies` is red on `main` too: 62 advisories (1 low, 23 moderate, 32
high, 6 critical) in `next@16.2.6`, `postcss`, `sharp` and their transitive
dependencies. The only dependency this branch adds is `vitest` as a devDependency,
and **zero advisories name vitest**. No pinned dependency version was changed.
Upgrading Next.js is a framework decision for the site owner, not something to do
inside a feature branch, so it was reported rather than actioned.

## What was built

### Core — `lib/cooking`, framework-independent

No React, no DOM, no I/O at import time. Runs unchanged in a server component, a
Node script, an Astro build step or a test.

- `types.ts` — the packet contract. Authored text is never rewritten; structure is
  never invented.
- `ids.ts` — positional derived ids, so an authored rewording cannot orphan
  stored progress and two identical ingredient lines cannot collide.
- `revision.ts` — content fingerprint; the mechanism behind stale detection.
- `persistence.ts` — site+recipe scoped storage. `sanitizeProgress` drops any id
  the packet does not contain, on read **and** write.
- `scaling.ts` — hard gate. Instruction steps are never scaled.
- `session.ts` — pure progress transitions.
- `boot.ts` — the only client module; reads storage via `useSyncExternalStore`.
- `adapters/norcook.ts` — the one live adapter.
- `adapters/eatfriete.example.ts` — **worked example, not integrated.**
- `README.md` — the full data contract and lifecycle.

### Norcook behaviour — implemented and tested

Ingredient check-off, completed-step tracking, previous/next navigation, an
optional focused view that always leaves the full recipe reachable, a shopping
list with real clipboard-success reporting and a selectable-text fallback,
explicit reset, device-local storage explained in the UI, and print that emits
the whole recipe rather than the active step.

The panel is **enhanced in place** — the same layout, classes and content — so a
printed page carries ingredients and steps exactly once. Unsupported packets fall
back to `components/recipe-plain-body.tsx`, the site's ordinary recipe view.

### Scaling — unavailable, deliberately

**All 77 Norcook packets report `{ available: false }`.** Norcook authors no
original yield, no structured quantities and no per-line scaling opt-in; its
ingredient lines are finished editorial prose such as
`500 g strong wheat flour`. Parsing a quantity out of that would mean guessing
where the unit ends. The gate and formatting helpers are implemented and
unit-tested against qualifying fixtures, so the next site that authors yield and
measured amounts gets scaling without reimplementing it. The panel states the
reason rather than hiding the limitation.

### Eatfriete — example only, NOT integrated

`lib/cooking/adapters/eatfriete.example.ts` was written by reading
`Oak-Main/eatfriete` at `74db4862`: `src/lib/packet-render.ts` and all six
`src/data-packets/*.json`.

**No Eatfriete code imports it. No Eatfriete page renders it. No Eatfriete build
or test exercises it. It has never been run in Eatfriete.** Eatfriete's own files
were not modified; it was cloned read-only to a separate directory.

It preserves Eatfriete's invariants rather than relaxing them:
`assertPacketInvariants` reproduces all four `packet drift` checks from
`packet-render.ts` lines 24–28, and `recipeJsonLd` mirrors the
`aggregateRating` removal. Its `recipeYield` is prose in three of six packets
("Makes 8 waffles"), and ingredient lines carry dual and approximate units
("1,000 g (2 lb 3 oz)", "about 2 L") — so scaling is correctly refused there too.

## Defects found and fixed

| Defect | Kind |
| --- | --- |
| `sanitizeProgress` unwrapped a `progress` key callers never pass, so restored progress always sanitised to empty | product |
| The check glyph intercepted pointer events, making check-offs look dead | product |
| The 64px sticky header covered scrolled-to rows and swallowed clicks | product |
| First "Next" press moved to a step already on screen — appeared inert | product |
| JS-only controls outside the control bar stayed visible without JS and in print | product |
| **`consent-provider.tsx` read `localStorage` unguarded from the root layout, so blocked storage crashed every page to the error boundary** | product, **pre-existing** |
| Step numbers printed vertically misaligned | cosmetic |

`components/recipe-card.tsx:17` and `components/saved-list.tsx:20` carry the same
unguarded pattern. They sit on the index and saved routes, which this pilot does
not touch, so they were left alone and reported here.

## Artifacts

| File | What |
| --- | --- |
| `norcook-cook-companion-pilot-d1574451.zip` | Sanitised source archive, 183 tracked files |
| `norcook-cook-companion-pilot-d1574451.zip.sha256` | Archive digest |
| `norcook-cook-companion-pilot-d1574451.manifest.txt` | Provenance + per-file sha256 |
| `review/print-*.pdf` | A4 print-to-PDF, 2–3 pages each |
| `review/screen-{desktop,mobile}-*.png` | Desktop 1440px, mobile 390px |
| `review/focus-mode-skillingsboller.png` | Single-step view |
| `review/print-view-*.png` | Print-media visual check |
| `review/evidence.json` | What was captured and why |
| `docs/cook-companion-acceptance.md` | Full acceptance matrix |

Archive digest:

```
0c69b317a7c10aecf720493a9d5b88dc7151249a03f2908aabeb509b0dd37e4b
```

Verified, not merely asserted: `node scripts/verify-handoff.mjs <archive>` unpacks
the archive and confirms all 183 files match their manifest hash and that no
`node_modules`, `.next`, `.git`, `.env`, `review/` or test output is present. The
build refuses to run if any credential-shaped pattern matches.

## Future rollout

Not started, and not started here:

1. **Eatfriete integration.** Real work: implement the adapter against the real
   build, add its own tests, wire the renderer without bypassing drift checks,
   and keep Astro's static output intact.
2. **Scaling.** Requires editorial authoring of yield, measured quantities and
   per-line opt-in flags — a content decision before it is a code one.
3. **Other sites.** Each needs an adapter over its own packet shape. The contract
   and lifecycle in `lib/cooking/README.md` are the input to that work.
4. **Next.js upgrade** to clear `audit:dependencies`.
5. **Storage-hardening** for `recipe-card.tsx` and `saved-list.tsx`.

## Constraints honoured

No pushes, merges, publishing, deployments, paid API calls, account changes,
credential configuration or external analytics. No recipes regenerated, no
recipe text rewritten, no site other than Norcook modified.