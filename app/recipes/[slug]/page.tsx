import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Clock, Flame } from 'lucide-react'
import { RECIPES, getRecipe, getRegion } from '@/lib/recipes'
import { getRecipeSafety } from '@/lib/recipe-safety'
import { absoluteUrl } from '@/lib/site'
import { adaptNorcookRecipe } from '@/lib/cooking/adapters/norcook'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CookRecipeBody } from '@/components/cook/cook-recipe-body'
import { RecipePlainBody } from '@/components/recipe-plain-body'
import { RecipeSafetyReview } from '@/components/recipe-safety-review'
import { RecipeViewTracker } from '@/components/recipe-view-tracker'

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const recipe = getRecipe(slug)
  if (!recipe) return { title: 'Recipe not found' }
  return {
    title: recipe.name,
    description: recipe.description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: {
      type: 'article',
      url: `/recipes/${recipe.slug}`,
      title: recipe.name,
      description: recipe.description,
      images: [{ url: recipe.image, alt: recipe.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.name,
      description: recipe.description,
      images: [recipe.image],
    },
  }
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = getRecipe(slug)
  if (!recipe) notFound()

  const region = getRegion(recipe.region)
  const history = recipe.history ?? []
  const safety = getRecipeSafety(recipe.slug)
  // Adapt once, on the server. The revision is computed here so the client
  // never has to recompute it, which keeps the server and client markup
  // identical and avoids a hydration mismatch.
  const cook = adaptNorcookRecipe({
    slug: recipe.slug,
    name: recipe.name,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    image: [absoluteUrl(recipe.image)],
    mainEntityOfPage: absoluteUrl(`/recipes/${recipe.slug}`),
    recipeCategory: region?.name,
    recipeIngredient: recipe.ingredients ?? [],
    recipeInstructions: (recipe.steps ?? []).map((text) => ({
      '@type': 'HowToStep',
      text,
    })),
  }

  return (
    <>
      <SiteHeader />
      <main>
        <RecipeViewTracker slug={recipe.slug} region={recipe.region} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
        {/* Massive header image */}
        <section
          data-recipe-hero=""
          className="relative -mt-16 h-[70vh] min-h-[480px] w-full overflow-hidden"
        >
          <div data-recipe-hero-media="" className="absolute inset-0">
            <Image
              src={recipe.image || '/images/recipe-header.webp'}
              alt={recipe.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/50" />
          </div>

          <div
            data-recipe-hero-content=""
            className="absolute inset-x-0 bottom-0"
          >
            <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
              {region && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-md">
                  {region.name} · {region.label}
                </span>
              )}
              <h1 className="mt-4 text-balance font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
                {recipe.name}
              </h1>
              <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-white/80">
                {recipe.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {recipe.cookingTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Flame className="size-4" />
                  {recipe.difficulty}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link
            href="/#recipes"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to the index
          </Link>
        </div>

        {safety && <RecipeSafetyReview safety={safety} />}

        {/* Cultural Context & History */}
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cultural Context &amp; History
          </h2>
          <div className="mt-6 space-y-5">
            {history.map((para) => (
              <div key={para}>
                <p className="text-pretty text-[17px] leading-[1.8] text-foreground/85">
                  {para}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Two-column: Ingredients + Instructions */}
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div
            data-cook-grid=""
            className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr]"
          >
            {cook.supported ? (
              <CookRecipeBody
                packet={cook.packet}
                chefTips={recipe.chefTips}
                tools={recipe.tools}
              />
            ) : (
              <RecipePlainBody
                ingredients={recipe.ingredients}
                steps={recipe.steps}
                chefTips={recipe.chefTips}
                tools={recipe.tools}
              />
            )}
          </div>
        </section>

        {/* More from the index */}
        <section
          data-cook-keep-off-print=""
          className="mx-auto max-w-4xl px-4 py-12 sm:px-6"
        >
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Keep exploring
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              There are {RECIPES.length - 1} more stories waiting in the index — from
              Arctic cures to viral bakes.
            </p>
            <Link
              href="/#recipes"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              Browse all recipes
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
