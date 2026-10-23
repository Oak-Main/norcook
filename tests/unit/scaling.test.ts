import { describe, expect, it } from 'vitest'

import { assessScaling, displayForItem, formatAmount } from '@/lib/cooking'
import type { IngredientGroup, IngredientItem } from '@/lib/cooking'

function group(items: Partial<IngredientItem>[]): IngredientGroup {
  return {
    id: 'g0',
    title: null,
    items: items.map((item, index) => ({
      id: `i${index}`,
      text: item.text ?? 'x',
      prep: null,
      quantity: item.quantity ?? null,
      scalable: item.scalable ?? false,
    })),
  }
}

describe('formatAmount', () => {
  it('keeps integers exact', () => {
    expect(formatAmount(4)).toBe('4')
    expect(formatAmount(1000)).toBe('1000')
  })

  it('renders common kitchen fractions exactly', () => {
    expect(formatAmount(0.5)).toBe('1/2')
    expect(formatAmount(1.5)).toBe('1 1/2')
    expect(formatAmount(0.25)).toBe('1/4')
    expect(formatAmount(0.75)).toBe('3/4')
  })

  it('never rounds an awkward value into a different fraction', () => {
    // The failure mode this guards: 0.4 becoming "2/5" or being rounded to 1/2.
    expect(formatAmount(0.4)).toBe('0.4')
    expect(formatAmount(0.333)).toBe('0.333')
  })
})

describe('assessScaling — refuses what cannot be scaled safely', () => {
  it('refuses when no yield is published', () => {
    const result = assessScaling({ yield: null, groups: [group([{ scalable: true }])] })
    expect(result.available).toBe(false)
    if (result.available) return
    expect(result.reason).toMatch(/yield/i)
  })

  it('refuses when quantities are prose rather than measured', () => {
    const result = assessScaling({
      yield: { amount: 4, unit: 'servings' },
      groups: [group([{ text: '500 g strong wheat flour', scalable: true }])],
    })
    expect(result.available).toBe(false)
    if (result.available) return
    expect(result.reason).toMatch(/prose/i)
  })

  it('refuses when no line carries an explicit opt-in', () => {
    const result = assessScaling({
      yield: { amount: 4, unit: 'servings' },
      groups: [
        group([{ quantity: { amount: 500, unit: 'g' }, scalable: false }]),
      ],
    })
    expect(result.available).toBe(false)
    if (result.available) return
    expect(result.reason).toMatch(/marked safe to scale/i)
  })

  it('refuses when there are no ingredients at all', () => {
    const result = assessScaling({
      yield: { amount: 4, unit: 'servings' },
      groups: [],
    })
    expect(result.available).toBe(false)
  })
})

describe('assessScaling — permits only fully authored packets', () => {
  it('allows scaling when yield, quantities and opt-in all exist', () => {
    const result = assessScaling({
      yield: { amount: 4, unit: 'servings' },
      groups: [
        group([{ quantity: { amount: 500, unit: 'g' }, scalable: true }]),
      ],
    })
    expect(result.available).toBe(true)
    if (!result.available) return
    expect(result.originalYield).toEqual({ amount: 4, unit: 'servings' })
    expect(result.multipliers).toContain(1)
  })

  it('always includes the 1× original even if adapters omit it', () => {
    const result = assessScaling({
      yield: { amount: 2, unit: 'servings' },
      groups: [group([{ quantity: { amount: 100, unit: 'g' }, scalable: true }])],
      multipliers: [2, 3],
    })
    expect(result.available).toBe(true)
    if (!result.available) return
    expect(result.multipliers).toEqual([1, 2, 3])
  })
})

describe('displayForItem — only opted-in lines are ever changed', () => {
  const prose = '500 g strong wheat flour'
  const scalable = group([
    { text: prose, quantity: { amount: 500, unit: 'g' }, scalable: true },
  ]).items[0]
  const unscalable = group([
    { text: prose, quantity: { amount: 500, unit: 'g' }, scalable: false },
  ]).items[0]
  const noQuantity = group([{ text: prose }]).items[0]

  it('scales a fully authored line', () => {
    const result = displayForItem(scalable, 2)
    expect(result.scaled).toBe(true)
    expect(result.text).toBe('1000 g')
  })

  it('leaves a line without opt-in verbatim at every multiplier', () => {
    expect(displayForItem(unscalable, 2)).toEqual({
      text: prose,
      scaled: false,
    })
  })

  it('leaves a prose line verbatim at every multiplier', () => {
    for (const multiplier of [0.5, 1, 2, 3]) {
      expect(displayForItem(noQuantity, multiplier)).toEqual({
        text: prose,
        scaled: false,
      })
    }
  })

  it('returns the authored text at 1× even for a scalable line', () => {
    expect(displayForItem(scalable, 1).text).toBe(prose)
  })

  it('renders a half yield as a whole number a cook can measure', () => {
    expect(displayForItem(scalable, 0.5).text).toBe('250 g')
  })
})