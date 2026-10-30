import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RECIPE_DETAILS } from '../lib/recipe-details.ts'

test('Hjortestek venison guidance has a consistent measured endpoint', () => {
  const recipe = RECIPE_DETAILS.hjortestek
  const text = [...recipe.steps, ...recipe.chefTips, ...recipe.tools.map(tool => tool.note)].join('\n')
  assert.match(recipe.steps.join('\n'), /thickest part reads at least 71°C \(160°F\)/)
  assert.match(text, /163°C \(325°F\)/)
  assert.doesNotMatch(text, /58°C|medium-rare|centre rosy/)
  assert.match(text, /Do not rely on colour or an assumed rise/)
})
