import { getRecipeSafety } from './recipe-safety'

/**
 * Page-level provenance for ordinary (non-safety-sensitive) recipes.
 *
 * The site publishes no individual byline: no legal operator, editorial owner,
 * or qualified food-safety reviewer has been named yet, and the editorial policy
 * forbids claiming a page was "reviewed" until one is. So this layer records
 * what is true — when the content was last checked, which sources back it, and
 * what has been adapted or left uncertain — and says so plainly when a recipe
 * has no page-level source yet.
 *
 * The map is deliberately sparse. An entry is added only when a real, checked
 * source or a real caveat exists; every other recipe falls back to the site-wide
 * checked date and the honest empty state.
 */

export type ProvenanceSource = {
  label: string
  url: string
  publisher: string
}

export type RecipeProvenance = {
  /** Overrides the site-wide CONTENT_REVIEW_DATE when a page was checked later. */
  checkedOn?: string
  /**
   * The date on which a reader-facing recipe, evidence, or structured-data fact
   * materially changed. This is the only provenance date eligible for sitemap
   * `lastmod` and Recipe `dateModified`; a routine check alone is not a change.
   */
  contentUpdatedOn?: string
  sources?: ProvenanceSource[]
  /** Adaptation, substitution, or an uncertainty worth stating outright. */
  note?: string
  /**
   * Optional facts for Recipe JSON-LD. Add a field only when it appears in an
   * authoritative content record. In particular, never infer a yield, split a
   * generic duration into prep/cook time, estimate nutrition, or invent a date
   * or author.
   */
  structuredData?: RecipeStructuredData
}

export type RecipeNutritionFacts = {
  calories?: string
  carbohydrateContent?: string
  fatContent?: string
  fiberContent?: string
  proteinContent?: string
  saturatedFatContent?: string
  sodiumContent?: string
  sugarContent?: string
}

export type RecipeStructuredData = {
  /** ISO 8601 calendar date from a publication record, never a guessed date. */
  datePublished?: string
  /** ISO 8601 duration from an explicit, tested prep-time record. */
  prepTime?: string
  /** ISO 8601 duration from an explicit, tested cook-time record. */
  cookTime?: string
  /** Exact visible yield from the authoritative recipe record. */
  recipeYield?: string
  /** Nutrition supplied by an authoritative calculation or label. */
  nutrition?: RecipeNutritionFacts
}

export const RECIPE_PROVENANCE: Record<string, RecipeProvenance> = {
  fenalar: {
    note: 'The home dry-curing method previously published here was withdrawn. This page is a serving guide for professionally produced fenalår and does not describe a preservation process.',
  },
  gravlaks: {
    note: 'An earlier version of this page carried a 24-hour home-freezing rule for parasite control. It was unsupported and has been removed; the food-safety callout above links the applicable guidance instead.',
  },
  rakfisk: {
    note: 'This page describes how rakfisk is bought, kept and served. It deliberately does not teach the fermentation, which needs controlled salt, temperature and verification.',
  },
  sursild: {
    note: 'Written as a refrigerated pickle from commercially salted herring. No shelf-stable canning process is implied or tested here.',
  },
  spekemat: {
    note: 'A serving and pairing guide for cured meats from inspected producers, not a home-curing method.',
  },
  'rokt-roye': {
    note: 'Written around commercially cold-smoked char. Cold smoking is treated here as a flavour step, not a preservation step.',
  },
  skillingsboller: {
    checkedOn: '2026-10-30',
    contentUpdatedOn: '2026-10-30',
    sources: [{ label: 'Raw flour and dough', url: 'https://www.cdc.gov/food-safety/foods/no-raw-dough.html', publisher: 'U.S. Centers for Disease Control and Prevention' }],
    note: 'Quantities follow common Bergen bakery proportions rather than any single documented original; the cardamom level is a deliberate editorial choice and is heavier than most Swedish versions.',
  },
  eplekake: {
    checkedOn: '2026-10-30',
    contentUpdatedOn: '2026-10-30',
    note: 'The method distinguishes the 150 g caster sugar for the batter from the separate 2 tbsp sugar for the apples. Quantities and baking schedule are unchanged; this was a source consistency check, not a kitchen test.',
  },
  lutefisk: {
    note: 'Written for pre-soaked lutefisk bought ready to cook. The lye treatment itself is a producer process and is described as history, not as instructions.',
  },
  smalahove: {
    note: 'Written for a prepared, salted and smoked head from a producer. Preparation of the raw head is not covered.',
  },
}

export function getRecipeProvenance(slug: string): RecipeProvenance | undefined {
  return RECIPE_PROVENANCE[slug]
}

/**
 * Return a date only where the record demonstrates a reader-facing change.
 * `checkedOn` deliberately does not participate: a periodic editorial check
 * may leave a page unchanged. For safety-sensitive recipes,
 * `safeguardsRecordedOn` is the date rendered as "editorial safeguards
 * recorded", so it is a published
 * evidence-freshness signal even while a qualified reviewer remains pending.
 */
export function getRecipeContentModifiedOn(slug: string): string | undefined {
  const provenance = getRecipeProvenance(slug)
  const safety = getRecipeSafety(slug)
  const candidates = [provenance?.contentUpdatedOn, safety?.safeguardsRecordedOn]
    .filter(isCalendarDate)
    .sort()

  return candidates[candidates.length - 1]
}

function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
}
