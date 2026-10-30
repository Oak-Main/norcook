import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  ArrowLeft,
  ChefHat,
  Clock,
  Flame,
  Lightbulb,
} from 'lucide-react'
import { RECIPES, getRecipe, getRegion } from '@/lib/recipes'
import { getRecipeSafety } from '@/lib/recipe-safety'
import {
  getRecipeContentModifiedOn,
  getRecipeProvenance,
} from '@/lib/recipe-provenance'
import { absoluteUrl, CONTENT_REVIEW_DATE } from '@/lib/site'
import { recipeSeoDescription, recipeSeoTitle } from '@/lib/seo'
import { SiteHeader } from '@/components/site-header'
import { PILOT_HERO, PILOT_SLUG, pilotDescription, pilotJsonld, renderPilotArticle } from '@/lib/packet-pilot'
import { PacketPrintHandler } from '@/components/packet-print'
import { SiteFooter } from '@/components/site-footer'
import { RecommendedTools } from '@/components/recommended-tools'
import { RecipeSafetyReview } from '@/components/recipe-safety-review'
import { RecipeProvenanceBlock } from '@/components/recipe-provenance'
import { SaveRecipeButton } from '@/components/save-recipe-button'
import { ImageOpsFigure } from '@/components/imageops-visual'
import { RecipeVisuals } from '@/components/recipe-visuals'
import {
  NUTRITION_ATTRIBUTION,
  NUTRITION_FETCHED_AT,
  NUTRITION_SOURCE_URL,
  type Per100gNutrition,
} from '@/lib/nutrition'

/** Modest muted per-100g nutrient line for one verified ingredient. */
function Per100gLine({ per100g }: { per100g: Per100gNutrition }) {
  const fmt = (value: number | undefined, unit: string) =>
    value === undefined || value === null ? null : `${Math.round(value * 10) / 10} ${unit}`
  const parts = [
    fmt(per100g.kcal, 'kcal'),
    fmt(per100g.protein_g, 'g protein'),
    fmt(per100g.fat_g, 'g fat'),
    fmt(per100g.carbs_g, 'g carbs'),
  ].filter(Boolean)
  if (parts.length === 0) return null
  return <span className="block text-xs text-muted-foreground">{parts.join(' · ')} per 100 g</span>
}

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }))
}

/**
 * The only site-wide duration record is the visible `cookingTime` label. It is
 * an overall time (often including a cure, smoke, or soak), not a defensible
 * split between preparation and cooking, so emit only Recipe `totalTime`.
 * This conversion preserves the published quantity and unit without guessing.
 */
function toIsoTotalTime(cookingTime: string): string | undefined {
  const duration = cookingTime.replace(/\s+(?:cure|smoke|soak)$/, '')
  const months = duration.match(/^(\d+)\s+month(?:s)?$/)?.[1]
  if (months) return `P${months}M`

  const weeks = duration.match(/^(\d+)\s+week(?:s)?$/)?.[1]
  if (weeks) return `P${weeks}W`

  const days = duration.match(/^(\d+)\s+day(?:s)?$/)?.[1]
  if (days) return `P${days}D`

  const hours = duration.match(/(\d+)\s+hr(?:s)?/)?.[1]
  const minutes = duration.match(/(\d+)\s+min(?:s)?/)?.[1]
  if (!hours && !minutes) return undefined

  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  // Pilot route: metadata follows the packet (real hero, packet title/desc).
  if (slug === PILOT_SLUG) {
    const ld = pilotJsonld()
    const desc = pilotDescription()
    const title = String(ld.name ?? 'Kanelsnurrer')
    return {
      title,
      description: desc,
      alternates: { canonical: `/recipes/${slug}` },
      openGraph: {
        type: 'article',
        url: `/recipes/${slug}`,
        title,
        description: desc,
        images: [{ url: PILOT_HERO, alt: title }],
      },
      twitter: { card: 'summary_large_image', title, description: desc, images: [PILOT_HERO] },
    }
  }
  const recipe = getRecipe(slug)
  if (!recipe) return { title: 'Recipe not found' }
  const title = recipeSeoTitle(recipe)
  const description = recipeSeoDescription(recipe)
  return {
    title,
    description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: {
      type: 'article',
      url: `/recipes/${recipe.slug}`,
      title,
      description,
      images: [{ url: recipe.image, alt: recipe.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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

  // Recipe Finalz presentation-packet pilot (markup contract v1)
  if (slug === PILOT_SLUG) {
    return (
      <>
        <SiteHeader />
        <main id="main-content" dangerouslySetInnerHTML={{ __html: renderPilotArticle() }} />
        <PacketPrintHandler />
        <SiteFooter />
      </>
    )
  }
  const recipe = getRecipe(slug)
  if (!recipe) notFound()

  const region = getRegion(recipe.region)
  const history = recipe.history ?? []
  const safety = getRecipeSafety(recipe.slug)
  const provenance = getRecipeProvenance(recipe.slug)
  const contentModifiedOn = getRecipeContentModifiedOn(recipe.slug)
  const checkedOn = contentModifiedOn ?? provenance?.checkedOn ?? CONTENT_REVIEW_DATE
  const structuredData = provenance?.structuredData
  const totalTime = toIsoTotalTime(recipe.cookingTime)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': absoluteUrl(`/recipes/${recipe.slug}#recipe`),
    url: absoluteUrl(`/recipes/${recipe.slug}`),
    name: recipe.name,
    description: recipe.description,
    image: [absoluteUrl(recipe.image)],
    inLanguage: 'en',
    recipeCuisine: 'Norwegian',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/recipes/${recipe.slug}`),
    },
    recipeCategory: region?.name,
    // The template deliberately has no default author, publication date,
    // yield, split times, or nutrition. Those fields appear only when an
    // authoritative recipe record supplies them. A routine check is not a
    // modification, so it cannot manufacture `dateModified` either.
    ...(contentModifiedOn ? { dateModified: contentModifiedOn } : {}),
    ...(structuredData?.datePublished
      ? { datePublished: structuredData.datePublished }
      : {}),
    ...(totalTime ? { totalTime } : {}),
    ...(structuredData?.prepTime ? { prepTime: structuredData.prepTime } : {}),
    ...(structuredData?.cookTime ? { cookTime: structuredData.cookTime } : {}),
    ...(structuredData?.recipeYield
      ? { recipeYield: structuredData.recipeYield }
      : {}),
    ...(structuredData?.nutrition
      ? {
          nutrition: {
            '@type': 'NutritionInformation',
            ...structuredData.nutrition,
          },
        }
      : {}),
    recipeIngredient: recipe.ingredients ?? [],
    recipeInstructions: (recipe.steps ?? []).map((text, position) => ({
      '@type': 'HowToStep',
      position: position + 1,
      text,
    })),
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\u003c'),
          }}
        />
        {/* Massive header image */}
        <section className="relative -mt-16 h-[70vh] min-h-[480px] w-full overflow-hidden">
          <Image
            src={recipe.image || '/images/recipe-header.webp'}
            data-imageops-asset={recipe.image.startsWith('/assets/') ? recipe.image.split('/').pop() : undefined}
            alt={recipe.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/50" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
              {region && (
                <Link
                  href={`/regions/${region.slug}`}
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  {region.name} · {region.label}
                </Link>
              )}
              <h1 className="mt-4 text-balance font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
                {recipe.name}
              </h1>
              <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-white/80">
                {recipe.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="size-4" />
                  {recipe.cookingTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Flame aria-hidden="true" className="size-4" />
                  {recipe.difficulty}
                </span>
                <SaveRecipeButton
                  slug={recipe.slug}
                  name={recipe.name}
                  variant="labelled"
                />
              </div>
            </div>
          </div>
        </section>

        {recipe.slug === 'gravlaks' && (
          <p className="mx-auto max-w-4xl px-4 pt-3 text-sm text-muted-foreground sm:px-6">
            Hero image: AI-created serving illustration; your finished dish may differ.
          </p>
        )}

        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link
            href="/#recipes"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to the index
          </Link>
        </div>

        {safety && <RecipeSafetyReview safety={safety} />}
        {['skillingsboller', 'eplekake'].includes(recipe.slug) && (
          <p className="mx-auto max-w-4xl px-4 text-sm text-muted-foreground sm:px-6">
            Hero image: AI-created serving illustration; your finished bake may differ.
          </p>
        )}

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
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr]">
            {/* Ingredients + tools rail */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
                <ChefHat aria-hidden="true" className="size-5 text-primary" />
                Ingredients
              </h2>
              <ul className="mt-5 flex flex-col gap-3">
                {recipe.ingredients?.map((ing) => {
                  const nutrition = recipe.ingredientNutrition?.[ing]
                  return (
                    <li
                      key={ing}
                      className="flex items-start gap-3 border-b border-border pb-3 text-sm leading-relaxed text-foreground/85 last:border-0"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                      <span>
                        {ing}
                        {nutrition ? <Per100gLine per100g={nutrition.per100g} /> : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {recipe.ingredientNutrition && Object.keys(recipe.ingredientNutrition).length > 0 ? (
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Per-100 g values shown for ingredients verified against{' '}
                  <a
                    href={NUTRITION_SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {NUTRITION_ATTRIBUTION}
                  </a>
                  {NUTRITION_FETCHED_AT ? ` (snapshot ${NUTRITION_FETCHED_AT.slice(0, 10)})` : ''}.
                  Ingredients not yet verified show no nutrition line.
                </p>
              ) : null}
              {recipe.slug === 'gravlaks' && <ImageOpsFigure id="salmon" />}
              <RecipeVisuals slug={recipe.slug} stage="ingredient" />

              {recipe.tools && recipe.tools.length > 0 && (
                <div className="mt-8">
                  <RecommendedTools tools={recipe.tools} />
                </div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                Step-by-Step Instructions
              </h2>
              <ol className="mt-5 flex flex-col gap-6">
                {recipe.steps?.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-[15px] leading-[1.75] text-foreground/85">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
              {recipe.slug === 'kanelsnurrer' && <ImageOpsFigure id="shaping" />}
              <RecipeVisuals slug={recipe.slug} stage="method" />

              {/* Chef's Tips callouts */}
              {recipe.chefTips && recipe.chefTips.length > 0 && (
                <div className="mt-10 space-y-4">
                  {recipe.chefTips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-xl border border-accent/40 bg-accent/10 p-5"
                    >
                      <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-accent" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                          Chef&apos;s Tip
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                          {tip}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {recipe.slug === 'skillingsboller' && (
          <section className="mx-auto max-w-4xl px-4 sm:px-6" aria-label="Serving illustration">
            <ImageOpsFigure id="serving" />
          </section>
        )}

        <RecipeProvenanceBlock
          checkedOn={checkedOn}
          regionName={region?.name}
          regionSlug={region?.slug}
          provenance={provenance}
          hasSafetyCallout={Boolean(safety)}
        />

        {/* More from the index */}
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
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
