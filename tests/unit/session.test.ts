import { describe, expect, it } from 'vitest'

import { emptyProgress } from '@/lib/cooking'
import {
  checkedIngredientCount,
  completedStepCount,
  nextStep,
  previousStep,
  setActiveStep,
  stepProgress,
  toggleId,
  toggleIngredient,
  toggleStep,
} from '@/lib/cooking/session'
import type { ProgressState } from '@/lib/cooking'
import type { RecipeStep } from '@/lib/cooking'

const steps: RecipeStep[] = [1, 2, 3, 4].map((order) => ({
  id: `s${order}`,
  order,
  text: `Step ${order}`,
  scalable: false,
}))

describe('toggling', () => {
  it('adds then removes, preserving order', () => {
    expect(toggleId(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('does not duplicate an existing id', () => {
    expect(toggleId(['a'], 'a')).toEqual([])
  })

  it('never mutates the argument', () => {
    const before = emptyProgress()
    const after = toggleStep(before, 's1')
    expect(before.completedSteps).toEqual([])
    expect(after).not.toBe(before)
  })

  it('toggles ingredients and steps independently', () => {
    let state: ProgressState = emptyProgress()
    state = toggleIngredient(state, 'i1')
    state = toggleStep(state, 's1')
    expect(state.checkedIngredients).toEqual(['i1'])
    expect(state.completedSteps).toEqual(['s1'])
  })
})

describe('active step', () => {
  it('ignores an id the packet does not contain', () => {
    const state = setActiveStep(emptyProgress(), 'nope', steps)
    expect(state.activeStepId).toBeNull()
  })

  it('ignores everything when there are no steps', () => {
    const state = setActiveStep(emptyProgress(), 's1', [])
    expect(state.activeStepId).toBeNull()
  })

  it('accepts a known step', () => {
    expect(setActiveStep(emptyProgress(), 's3', steps).activeStepId).toBe('s3')
  })
})

describe('previous/next navigation', () => {
  it('has no previous step at the first step', () => {
    expect(previousStep('s1', steps)).toBeNull()
  })

  it('has no next step at the last step', () => {
    expect(nextStep('s4', steps)).toBeNull()
  })

  it('moves within range', () => {
    expect(previousStep('s3', steps)?.id).toBe('s2')
    expect(nextStep('s3', steps)?.id).toBe('s4')
  })

  it('starts at the first step when nothing is active', () => {
    expect(nextStep(null, steps)?.id).toBe('s1')
    expect(previousStep(null, steps)).toBeNull()
  })

  it('recovers to the first step from an unknown id', () => {
    expect(nextStep('gone', steps)?.id).toBe('s1')
  })

  it('returns null for an empty step list', () => {
    expect(nextStep(null, [])).toBeNull()
    expect(previousStep(null, [])).toBeNull()
  })

  it('walks the whole recipe forwards and stops', () => {
    let cursor: string | null = null
    const visited: string[] = []
    for (;;) {
      const target = nextStep(cursor, steps)
      if (!target) break
      visited.push(target.id)
      cursor = target.id
    }
    expect(visited).toEqual(['s1', 's2', 's3', 's4'])
  })
})

describe('progress reporting', () => {
  it('counts completed steps', () => {
    const state = { ...emptyProgress(), completedSteps: ['s1', 's2'] }
    expect(completedStepCount(state)).toBe(2)
    expect(stepProgress(state, 4)).toBe(0.5)
  })

  it('never reports more than the total', () => {
    const state = {
      ...emptyProgress(),
      completedSteps: ['a', 'b', 'c'],
      checkedIngredients: ['x', 'y', 'z', 'w'],
    }
    expect(stepProgress(state, 2)).toBe(1)
    expect(checkedIngredientCount(state, 2)).toBe(2)
  })

  it('handles a zero total without dividing by zero', () => {
    expect(stepProgress(emptyProgress(), 0)).toBe(0)
    expect(checkedIngredientCount(emptyProgress(), 0)).toBe(0)
  })
})