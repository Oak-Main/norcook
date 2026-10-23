/**
 * Ordinary recipe view — the fallback when a packet cannot be adapted.
 *
 * This is the site's pre-existing ingredient/step layout, unchanged, and it is
 * what a cook sees when the adapter reports `{ supported: false }`. It carries no
 * checkboxes, no navigation and no persistence: a plain, complete, readable and
 * printable recipe.
 *
 * Keeping it as a separate component rather than an inline branch means the
 * unsupported path is a real, renderable view that can be tested directly,
 * instead of markup that no packet ever reaches.
 */

import { ChefHat, Lightbulb } from 'lucide-react'

import { RecommendedTools } from '@/components/recommended-tools'

type Tool = { name: string; note: string; href?: string }

export type RecipePlainBodyProps = {
  ingredients?: string[]
  steps?: string[]
  chefTips?: string[]
  tools?: Tool[]
}

export function RecipePlainBody({
  ingredients,
  steps,
  chefTips,
  tools,
}: RecipePlainBodyProps) {
  return (
    <>
      {/* Ingredients + tools rail */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
          <ChefHat className="size-5 text-primary" />
          Ingredients
        </h2>
        <ul className="mt-5 flex flex-col gap-3">
          {ingredients?.map((ing) => (
            <li
              key={ing}
              className="flex items-start gap-3 border-b border-border pb-3 text-sm leading-relaxed text-foreground/85 last:border-0"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {ing}
            </li>
          ))}
        </ul>

        {tools && tools.length > 0 && (
          <div className="mt-8">
            <RecommendedTools tools={tools} />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Step-by-Step Instructions
        </h2>
        <ol className="mt-5 flex flex-col gap-6">
          {steps?.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <p className="pt-1 text-[15px] leading-[1.75] text-foreground/85">{step}</p>
            </li>
          ))}
        </ol>

        {chefTips && chefTips.length > 0 && (
          <div className="mt-10 space-y-4">
            {chefTips.map((tip, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-accent/40 bg-accent/10 p-5"
              >
                <Lightbulb className="size-5 shrink-0 text-accent" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Chef&apos;s Tip
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}