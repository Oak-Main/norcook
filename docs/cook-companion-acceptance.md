Content-Type: text/markdown
# Cook companion pilot — acceptance matrix

Branch `feat/cook-companion-pilot` in `C:\Users\Dell\norcook-pilot-wt`
(worktree of `Oak-Main/norcook` at `a051960`). Norcook `main` was not modified.
Nothing was pushed, merged, deployed or published.

Legend: **Pass** — exercised by an automated test that was seen to fail when the
guard was removed or was first written. **Manual** — verified by inspecting the
generated artefact.

---

## 0. Source handoff corrections

The brief named `components/packet-print.tsx` as the starting point and described
an existing print handler delegating to `window.print()`. **Neither exists in
Norcook at `a051960`.** Verified by grep across the repo:

- no `components/packet-print.tsx`
- no `window.print()` call anywhere
- no `@media print` or `@page` rule anywhere
- `grep -r "window\.print|@media print|@page|beforeprint|afterprint"` → 0 matches

Printing was therefore built from zero rather than extended. Norcook is Next.js
16 + React 19 + Tailwind v4; Eatfriete is **Astro**. They share no framework, so
no common component was assumed.

| Check | Result |
| --- | --- |
| Norcook worktree, single writer per file | Pass |
| Norcook `main` untouched | Pass — `git -C C:\Users\Dell\norcook status` clean |
| Eatfriete treated read-only | Pass — cloned to a separate directory; `git status` clean there |
| Authored content preserved | Pass — 77/77 recipes byte-identical |
| No recipe regenerated | Pass — `lib/recipes.ts` and `lib/recipe-details.ts` unmodified |

---

## 1. Adapter contract and unsupported fallback

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 1.1 | Small typed adapter for identity, revision, groups, steps | `lib/cooking/types.ts` | Pass |
| 1.2 | Explicit IDs preferred; derived ids deterministic | `lib/cooking/ids.ts` | Pass |
| 1.3 | No invented structured quantities | `quantity: null` for all 77 packets — `content-parity.test.ts` | Pass |
| 1.4 | Unsupported packets keep a usable ordinary view | `components/recipe-plain-body.tsx`; `adapter-norcook.test.ts` | Pass |
| 1.5 | Grouping derived from authored signal only | 18 authored `For the…:` prefixes in the corpus | Pass |
| 1.6 | Group heading never strips the authored line | full prefixed line kept as `text` | Pass |

## 2. Reader journey

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 2.1 | Ingredient check-off | e2e `checks off an ingredient…` | Pass |
| 2.2 | Completed-step tracking | progress label + `data-cook-done` | Pass |
| 2.3 | Previous / next navigation | e2e `moves through steps…` | Pass |
| 2.4 | Optional focused cooking view | e2e `focused cooking view` | Pass |
| 2.5 | Full recipe always reachable | "Show full recipe" restores all steps | Pass |
| 2.6 | Wording, order, warnings, temperatures, durations preserved | `content-parity.test.ts` byte-equality across 77 recipes | Pass |
| 2.7 | Accessible no-JS reading | e2e `without JavaScript` (2 tests) | Pass |

## 3. Shopping list

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 3.1 | Preserves ingredient groups | `For the filling` heading in copied text | Pass |
| 3.2 | Preserves preparation qualifiers | `250 ml whole milk, lukewarm` | Pass |
| 3.3 | Preserves unknown quantities | `Pearl sugar and one beaten egg, to finish` | Pass |
| 3.4 | Never combines incompatible units | no parser exists; `shopping-list.test.ts` asserts no `oz/lb/cup` and no combined `750 g` | Pass |
| 3.5 | Never merges similarly named ingredients | 3 identical lines stay 3 lines | Pass |
| 3.6 | Reports actual clipboard success | success text only after `writeText` resolves | Pass |
| 3.7 | Visible selectable fallback on refusal | e2e `falls back to selectable text…` | Pass |

## 4. Printing

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 4.1 | Prints complete recipe, not just the active step | e2e `prints hidden steps when focus mode is on` | Pass |
| 4.2 | Hides controls without hiding content | e2e print test | Pass |
| 4.3 | Safety notes print, with authority URLs | e2e `prints the food-safety callout…` | Pass |
| 4.4 | Pagination checked with real print-to-PDF | `review/*.pdf`, 2–3 pages each | Manual |
| 4.5 | Long ingredients / multi-page recipes | `fiskesuppe`, `kransekake`, `skillingsboller` PDFs | Manual |
| 4.6 | Sticky elements unpinned for paged media | e2e `leaves the sticky ingredient rail unpinned` | Pass |
| 4.7 | Recipe title stays legible on paper | hero flattened, white text forced to black — asserted `rgb(0,0,0)` | Pass |

## 5. Persistence

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 5.1 | Keyed by site, recipe ID, revision | `norcook:cook:v1:<site>:<recipe>` | Pass |
| 5.2 | Survives reload | e2e `survives a reload` | Pass |
| 5.3 | Explicit reset | e2e `resets progress on request…` | Pass |
| 5.4 | Device-local storage explained | asserted in the UI text | Pass |
| 5.5 | Stale progress detected, reset offered, not applied | e2e `offers a reset when the stored revision…` | Pass |
| 5.6 | No leak between recipes | e2e `never shows one recipe's progress on another` | Pass |
| 5.7 | Storage errors do not break reading or controls | e2e `keeps reading and cooking working when storage is denied` | Pass |

## 6. Scaling and structured data

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 6.1 | Canonical content and JSON-LD preserved | e2e `publishes unchanged Recipe JSON-LD`; page JSON-LD block untouched | Pass |
| 6.2 | Scaling only where yield + quantities + flags exist | `assessScaling` requires all three | Pass |
| 6.3 | Never scales equipment, temps, times, procedural numbers | steps are never scaled; no multiplier path touches step text | Pass |
| 6.4 | Shows original values and multiplier | unreachable on Norcook — no packet qualifies | N/A |
| 6.5 | Does not mutate canonical JSON-LD | no code path writes JSON-LD | Pass |
| 6.6 | Says so where scaling cannot be reliable | reason rendered in the panel; e2e asserts `yield` wording | Pass |

**Scaling is unavailable for all 77 Norcook packets, by design.** Norcook authors
no yield, no structured quantities and no per-line opt-in, and its ingredient
lines are editorial prose. The gate and formatting are implemented and
unit-tested against qualifying fixtures, so they are ready for a site that does
author them. This is reported as an honest result, not a gap.

## 7. Visual finish

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 7.1 | Restrained, touch-friendly, in the existing system | `review/screen-mobile-*.png`, `screen-desktop-*.png` | Manual |
| 7.2 | Large readable steps, useful progress, strong contrast | 17px steps at 1.75 line-height; `progressbar` role | Pass |
| 7.3 | Visible focus, forgiving tap targets | e2e asserts a solid 3px outline ring; 44px min-height | Pass |
| 7.4 | No modal overload or unnecessary animation | inline panel; no dialogs; transitions limited to colour/width | Pass |
| 7.5 | Sticky controls never obscure content or focus | static below `lg`; e2e asserts `position: static` at 375px | Pass |
| 7.6 | No wholesale recipe-page redesign | same layout, classes and content; enhanced in place | Pass |

## 8. Reuse without false claims

| # | Requirement | Evidence | Result |
| --- | --- | --- | --- |
| 8.1 | Core kept framework-independent | `lib/cooking` has no React/DOM/I/O except `boot.ts` | Pass |
| 8.2 | Data contract and lifecycle documented | `lib/cooking/README.md` | Pass |
| 8.3 | Eatfriete example from the actual renderer and packet shape | `adapters/eatfriete.example.ts`, read at `74db4862` | Pass |
| 8.4 | Eatfriete drift invariants preserved | `assertPacketInvariants` reproduces all four checks; 5 tests | Pass |
| 8.5 | Eatfriete JSON-LD invariant preserved | `aggregateRating` stripped; 3 tests | Pass |
| 8.6 | **Labelled unintegrated unless genuinely implemented** | **Unintegrated.** Banner in the file header, this matrix, and the handoff all say so | Pass |
| 8.7 | 21 sites not modified or deployed | only Norcook changed | Pass |

---

## Defects found and fixed during this work

| Defect | Kind | Fix |
| --- | --- | --- |
| `sanitizeProgress` unwrapped a `progress` key that callers do not pass, so stored progress always sanitised to empty | Product | Accept the progress value directly; `persistence.test.ts` |
| The check glyph inside the checkbox box intercepted pointer events, making check-offs look dead | Product | `pointer-events: none` on the box and its icon |
| The 64px sticky site header covered rows scrolled into view and swallowed clicks | Product | `scroll-margin-top` on ingredients and steps |
| First "Next" press moved from "nothing" to step 1, which was already on screen — appeared to do nothing | Product | Navigate from the effective active step |
| JS-only controls outside the control bar (copy, scaling note) stayed visible without JS and in print | Product | `data-cook-js-only` + `hidden` gating and a print rule |
| **Pre-existing:** `consent-provider.tsx` read `localStorage` unguarded in the root layout, so blocked storage crashed **every page** to the error boundary | Product | try/catch on read and write, matching `theme-provider.tsx` |
| Step numbers printed vertically misaligned against their text | Cosmetic | `align-items: flex-start` in print |

`components/recipe-card.tsx:17` and `components/saved-list.tsx:20` have the same
unguarded `localStorage` pattern. They are on the index and saved routes, which
this pilot does not touch, so they were left alone and are reported here instead.

## Test totals

| Suite | Command | Result |
| --- | --- | --- |
| Unit | `pnpm test:unit` | **139 passed** (9 files) |
| E2E | `pnpm test:e2e` | **34 passed** (28 new + 6 pre-existing, zero regressions) |
| Lint | `pnpm lint` | 0 problems, `--max-warnings=0` |
| Types | `pnpm typecheck` | clean |
| Content gate | `pnpm check:content` | 77 recipes, 6 safety records |
| Build | `pnpm build` | 89 static pages |