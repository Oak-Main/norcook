import { AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react'
import type { RecipeSafety } from '@/lib/recipe-safety'

export function RecipeSafetyReview({ safety }: { safety: RecipeSafety }) {
  return (
    <section
      aria-labelledby="food-safety-heading"
      data-recipe-safety=""
      className="mx-auto max-w-4xl px-4 py-4 sm:px-6"
    >
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
              Food-safety callout · {safety.category}
            </p>
            <h2
              id="food-safety-heading"
              className="mt-1 font-display text-xl font-bold tracking-tight text-foreground"
            >
              Read before preparing this recipe
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">
              {safety.summary}
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {safety.safeguards.map((safeguard) => (
            <li
              key={safeguard}
              className="flex gap-2 text-sm leading-relaxed text-foreground/85"
            >
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              {safeguard}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-amber-500/25 pt-4">
          <p className="text-xs font-medium text-foreground">
            Review status: {safety.status} · editorial safeguards added{' '}
            <time dateTime={safety.reviewedOn}>{safety.reviewedOn}</time>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A named, qualified food-safety owner has not yet signed off. Sources
            below support the callout; they do not turn this page into a
            validated commercial process.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {safety.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {source.authority}: {source.label}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
