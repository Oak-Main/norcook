# Reproducible release gate

The supported local runtime is Node 22.19.0 or later. CI runs Node 24 to match
the Vercel production runtime (24.x). Both use pnpm 11.9.0.
The performance gate uses the Playwright-pinned Chromium installed by the
browser-install step below, unless `LIGHTHOUSE_CHROME_PATH` explicitly selects
a managed browser.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm check:content
pnpm check:images
pnpm audit:dependencies
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm release:check` runs everything above except the Playwright browser
install. The two Lighthouse runs are **CI-only** and are not part of
`release:check`, because a laptop's thermal state makes local Lab numbers
misleading:

```sh
pnpm test:performance:mobile
pnpm test:performance:desktop
```

`next build` performs TypeScript validation because build errors are no longer
ignored. CI also runs a separate typecheck for faster diagnostics.

pnpm build scripts use an explicit allowlist in `pnpm-workspace.yaml`: Sharp and
the native resolver may run their required install checks; MSW's nonessential
postinstall is denied.

## What the gate actually enforces

`docs/release-checklist.md` is the reusable list of gates and
`docs/release-record.md` is this property's dated pass/fail record against it.
Do not add a gate here without also wiring it to a test or a script — a
documented gate that nothing runs is worse than an undocumented one, because it
reads as coverage that does not exist.

| Area | Enforced by |
| --- | --- |
| Content and honesty invariants | `scripts/check-content.mjs` |
| Image source budgets | `scripts/check-image-budgets.mjs` |
| Security headers | `tests/e2e/site.spec.ts` |
| Sitemap truthfulness (every `<loc>` 200 and indexable) | `tests/e2e/site.spec.ts` |
| Structured data across a sample of routes | `tests/e2e/site.spec.ts` |
| Skip link, focus visibility, dialog focus management | `tests/e2e/focus.spec.ts` |
| WCAG A/AA on 8 routes plus the consent banner and dialog | `tests/e2e/accessibility.spec.ts` |
| Mobile horizontal overflow on 3 route shapes | `tests/e2e/accessibility.spec.ts` |
| Newsletter route contract while dormant | `tests/e2e/newsletter-api.spec.ts` |
| Desktop and mobile screenshots for human review | `tests/e2e/screenshots.spec.ts` |
| Transfer budgets and Core Web Vitals | `scripts/run-lighthouse.mjs` + `performance-budget.json` |

## Performance budgets

- source hero assets: 300 KiB and 1920 px maximum;
- source card assets: 180 KiB and 1200 px maximum;
- page images: 900 KiB transfer budget;
- scripts: 330 KiB transfer budget;
- stylesheets: 100 KiB transfer budget;
- total page weight: 1.5 MiB;
- third-party requests: 0;
- mobile LCP ≤ 3.5 s, CLS ≤ 0.1, TBT ≤ 600 ms;
- desktop LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms.

The local runner reads `performance-budget.json` as the single source of truth
for transfer limits and throws when any asserted limit is exceeded. It also
asserts category scores, FCP, LCP, CLS, TBT, and zero third-party network
requests.

The runner writes every JSON report, a selected representative report, and a
manifest to `.lighthouseci/` for the CI artifact. It runs the homepage, a
representative safety-sensitive recipe, and a region hub on both mobile and
desktop profiles. Mobile uses three valid runs and enforces the median of each
individual metric (rather than copying thresholds from an arbitrarily selected
single report); a third-party request fails every individual run. Lab TBT is
used as a responsiveness proxy; production INP still requires consented
real-user measurement.
