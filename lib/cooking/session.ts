/**
 * Pure progress transitions.
 *
 * Kept out of the React component so that navigation and toggling can be tested
 * directly, without a DOM, and so that the component holds no logic of its own
 * beyond rendering and effect wiring.
 *
 * All functions are pure: they return new state and never mutate the argument.
 */

import type { ProgressState } from './persistence'
import { emptyProgress } from './persistence'
import type { RecipeStep } from './types'

/** Adds `id` when absent, removes it when present. Order is preserved. */
export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]
}

export function toggleIngredient(
  state: ProgressState,
  id: string,
): ProgressState {
  return { ...state, checkedIngredients: toggleId(state.checkedIngredients, id) }
}

export function toggleStep(state: ProgressState, id: string): ProgressState {
  return { ...state, completedSteps: toggleId(state.completedSteps, id) }
}

/**
 * Sets the active step, clamped to the available range.
 *
 * An id that is not in `steps` is ignored rather than stored, so a restored
 * value pointing at a removed step cannot leave the companion pointing nowhere.
 */
export function setActiveStep(
  state: ProgressState,
  stepId: string,
  steps: RecipeStep[],
): ProgressState {
  if (steps.length === 0) return state
  const known = steps.some((step) => step.id === stepId)
  if (!known) return state
  return { ...state, activeStepId: stepId }
}

/** Step before `current`, or `null` at the first step. */
export function previousStep(
  current: string | null,
  steps: RecipeStep[],
): RecipeStep | null {
  if (steps.length === 0) return null
  const index = steps.findIndex((step) => step.id === current)
  if (index <= 0) return null
  return steps[index - 1]
}

/**
 * Step after `current`, or `null` at the last step.
 *
 * With no active step, returns the first step, so a first press of "Next" moves
 * forward rather than appearing to do nothing.
 */
export function nextStep(current: string | null, steps: RecipeStep[]): RecipeStep | null {
  if (steps.length === 0) return null
  if (current === null) return steps[0]
  const index = steps.findIndex((step) => step.id === current)
  if (index === -1) return steps[0]
  if (index >= steps.length - 1) return null
  return steps[index + 1]
}

/** Count of steps, never above `total`, for the progress readout. */
export function completedStepCount(state: ProgressState): number {
  return state.completedSteps.length
}

/** Fraction of steps completed, in the range 0–1. */
export function stepProgress(state: ProgressState, total: number): number {
  if (total <= 0) return 0
  return Math.min(1, state.completedSteps.length / total)
}

/** Count of ingredient lines checked off, never above `total`. */
export function checkedIngredientCount(
  state: ProgressState,
  total: number,
): number {
  return Math.min(state.checkedIngredients.length, Math.max(0, total))
}

/** Fresh state, re-exported so callers need one import for session work. */
export function freshProgress(): ProgressState {
  return emptyProgress()
}