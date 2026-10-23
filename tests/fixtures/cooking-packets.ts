/**
 * Edge-case fixtures for the cooking adapter contract.
 *
 * Every fixture here is a hand-built test input, not site data, and is labelled
 * as such. They exist to cover shapes the live Norcook corpus does not contain
 * — duplicate ingredients, very long steps, absent optional fields and packets
 * the adapter must refuse — so those branches are exercised rather than assumed.
 *
 * Real-packet coverage lives in `tests/unit/content-parity.test.ts`, which walks
 * all 77 published Norcook recipes.
 */

import type { NorcookRecipeSource } from '@/lib/cooking/adapters/norcook'

/**
 * A fixture whose packet publishes both arrays, so tests can index them without
 * re-asserting. Fixtures that deliberately omit an array use the plain
 * `NorcookRecipeSource` shape.
 */
export type CompleteFixtureRecipe = NorcookRecipeSource & {
  ingredients: string[]
  steps: string[]
}

export type LabelledFixture<
  T extends NorcookRecipeSource = NorcookRecipeSource,
> = {
  /** What this fixture is for. */
  readonly label: string
  readonly recipe: T
}

/** Two identical lines are two real shopping items, not one. */
export const DUPLICATE_INGREDIENTS: LabelledFixture<CompleteFixtureRecipe> = {
  label: 'duplicate ingredient wording',
  recipe: {
    slug: 'fixture-duplicates',
    name: 'Fixture: Duplicates',
    ingredients: [
      '200 g butter',
      '200 g butter',
      '1 tbsp sea salt',
      '200 g butter',
    ],
    steps: ['Cream the butter and salt together.', 'Bake until golden.'],
  },
}

/** Authored sub-list headings, as the live corpus uses them. */
export const GROUPED_INGREDIENTS: LabelledFixture<CompleteFixtureRecipe> = {
  label: 'authored sub-list groupings',
  recipe: {
    slug: 'fixture-groups',
    name: 'Fixture: Grouped',
    ingredients: [
      '500 g strong wheat flour',
      '250 ml whole milk, lukewarm',
      'For the filling: 100 g butter, 100 g brown sugar, 2 tbsp cinnamon',
      'Pearl sugar and one beaten egg, to finish',
    ],
    steps: ['Mix the dough.', 'Roll, fill and bake.'],
  },
}

/** A heading as the very first line, which must not leave an empty leading group. */
export const HEADING_FIRST: LabelledFixture<CompleteFixtureRecipe> = {
  label: 'sub-list heading as the first ingredient line',
  recipe: {
    slug: 'fixture-heading-first',
    name: 'Fixture: Heading First',
    ingredients: [
      'For the sauce: 3 tbsp Dijon, 1 tbsp sugar, 1 tbsp vinegar',
      '400 g firm white fish',
      '200 ml double cream',
    ],
    steps: ['Simmer the sauce base.', 'Add the fish and poach.'],
  },
}

/** Safety-relevant wording and numbers that must survive byte-for-byte. */
export const SAFETY_CRITICAL_WORDING: LabelledFixture<CompleteFixtureRecipe> = {
  label: 'temperatures, durations and warnings in authored wording',
  recipe: {
    slug: 'fixture-safety-wording',
    name: 'Fixture: Safety Wording',
    ingredients: [
      '1 litre good fish stock',
      'Crushed juniper berries and black pepper, optional',
    ],
    steps: [
      'Hold the oil at 180 °C and fry for 7–9 minutes, until cooked through.',
      'Temper the cream with the egg yolk, then stir into the gently simmering stock — do not boil.',
      'Return unused meat to refrigeration promptly; do not leave it on the serving table for more than two hours.',
      '24 hours in a typical home freezer is not a safe general rule.',
    ],
  },
}

/** Optional fields absent entirely: steps only. */
export const MISSING_INGREDIENTS: LabelledFixture = {
  label: 'no ingredient list published',
  recipe: {
    slug: 'fixture-no-ingredients',
    name: 'Fixture: No Ingredients',
    steps: ['Warm the pan.', 'Add the stock and simmer for 20 minutes.'],
  },
}

/** Optional fields absent entirely: ingredients only. */
export const MISSING_STEPS: LabelledFixture = {
  label: 'no instruction steps — adapter must report unsupported',
  recipe: {
    slug: 'fixture-no-steps',
    name: 'Fixture: No Steps',
    ingredients: ['1 kg reindeer meat, ideally on the bone', '1 litre water'],
  },
}

/** Steps present but blank: still unsupported. */
export const BLANK_STEPS: LabelledFixture<CompleteFixtureRecipe> = {
  label: 'steps present but empty strings',
  recipe: {
    slug: 'fixture-blank-steps',
    name: 'Fixture: Blank Steps',
    ingredients: ['1 kg flour'],
    steps: ['', '   '],
  },
}

/** No stable identity. */
export const MISSING_SLUG: LabelledFixture = {
  label: 'no stable slug — adapter must report unsupported',
  recipe: {
    slug: '',
    name: 'Fixture: No Slug',
    steps: ['Cook it.'],
  },
}

/** A step long enough to span lines on a printed page. */
export const LONG_STEP: LabelledFixture<CompleteFixtureRecipe> = {
  label: 'a single very long instruction',
  recipe: {
    slug: 'fixture-long-step',
    name: 'Fixture: Long Step',
    ingredients: ['2 carrots, peeled and cut into very thin even batons'],
    steps: [
      'Score the rind into small squares with a very sharp knife, cutting cleanly through the skin but not into the meat. Rub the surface with coarse salt, working it into every scored edge so the salt reaches the fat layer beneath, then set the leg aside on a rack over a tray for up to thirty minutes while the salt begins to draw moisture from the surface without the exterior drying out or the interior warming toward unsafe temperatures during the wait.',
    ],
  },
}

export const ALL_FIXTURES: LabelledFixture[] = [
  DUPLICATE_INGREDIENTS,
  GROUPED_INGREDIENTS,
  HEADING_FIRST,
  SAFETY_CRITICAL_WORDING,
  MISSING_INGREDIENTS,
  MISSING_STEPS,
  BLANK_STEPS,
  MISSING_SLUG,
  LONG_STEP,
]