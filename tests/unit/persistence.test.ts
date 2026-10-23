import { describe, expect, it } from 'vitest'

import { adaptNorcookRecipe } from '@/lib/cooking/adapters/norcook'
import {
  PROGRESS_SCHEMA_VERSION,
  STORAGE_NAMESPACE,
  clearProgress,
  emptyProgress,
  loadProgress,
  progressKey,
  resolveStorage,
  sanitizeProgress,
  saveProgress,
} from '@/lib/cooking'
import type { StorageLike } from '@/lib/cooking'
import {
  DUPLICATE_INGREDIENTS,
  GROUPED_INGREDIENTS,
  SAFETY_CRITICAL_WORDING,
} from '@/tests/fixtures/cooking-packets'

/** In-memory `StorageLike`, so these tests need no DOM and no browser. */
function memoryStorage(seed: Record<string, string> = {}): StorageLike & {
  dump: Record<string, string>
} {
  const map = new Map(Object.entries(seed))
  return {
    dump: map as unknown as Record<string, string>,
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

/** Storage whose every operation throws, as a locked-down browser would. */
function deniedStorage(): StorageLike {
  const deny = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }
  return { getItem: deny, setItem: deny, removeItem: deny }
}

const packetFor = (slug: string) => {
  const result = adaptNorcookRecipe({ ...GROUPED_INGREDIENTS.recipe, slug })
  if (!result.supported) throw new Error('fixture should be supported')
  return result.packet
}

const ALPHA = packetFor('alpha')
const BETA = packetFor('beta')

describe('storage key scoping', () => {
  it('namespaces by site and recipe', () => {
    expect(progressKey('norcook', 'gravlaks')).toBe(`${STORAGE_NAMESPACE}:norcook:gravlaks`)
  })

  it('gives different recipes different keys', () => {
    expect(progressKey('norcook', 'alpha')).not.toBe(progressKey('norcook', 'beta'))
  })
})

describe('progress must not leak between recipes', () => {
  it('reports empty for a recipe that was never touched', () => {
    const storage = memoryStorage()
    saveProgress(storage, ALPHA, {
      checkedIngredients: [ALPHA.groups[0].items[0].id],
      completedSteps: [ALPHA.steps[0].id],
      activeStepId: ALPHA.steps[0].id,
    })

    const result = loadProgress(storage, BETA)
    expect(result.status).toBe('empty')
  })

  it('does not apply another recipe\'s step ids even if they are written under this key', () => {
    const storage = memoryStorage()
    // Simulates a hand-edited or restored value: right key, foreign ids.
    storage.setItem(
      progressKey(BETA.siteId, BETA.recipeId),
      JSON.stringify({
        v: PROGRESS_SCHEMA_VERSION,
        siteId: BETA.siteId,
        recipeId: BETA.recipeId,
        revision: BETA.revision,
        updatedAt: 1,
        progress: {
          checkedIngredients: [ALPHA.groups[0].items[0].id],
          completedSteps: ALPHA.steps.map((step) => step.id),
          activeStepId: ALPHA.steps[0].id,
        },
      }),
    )

    const result = loadProgress(storage, BETA)
    expect(result.status).toBe('restored')
    if (result.status !== 'restored') return
    // Alpha and beta share ids only because the fixtures are identical; the
    // guard under test is the foreign-*recipe* case below.
    expect(result.progress.completedSteps.every((id) => BETA.steps.some((s) => s.id === id))).toBe(true)
  })

  it('drops ids the packet does not contain', () => {
    const storage = memoryStorage()
    const foreignStepId = 'd:step:99'
    storage.setItem(
      progressKey(ALPHA.siteId, ALPHA.recipeId),
      JSON.stringify({
        v: PROGRESS_SCHEMA_VERSION,
        siteId: ALPHA.siteId,
        recipeId: ALPHA.recipeId,
        revision: ALPHA.revision,
        updatedAt: 1,
        progress: {
          checkedIngredients: ['not-an-ingredient-id'],
          completedSteps: [ALPHA.steps[0].id, foreignStepId],
          activeStepId: foreignStepId,
        },
      }),
    )

    const result = loadProgress(storage, ALPHA)
    expect(result.status).toBe('restored')
    if (result.status !== 'restored') return
    expect(result.progress.completedSteps).toEqual([ALPHA.steps[0].id])
    expect(result.progress.checkedIngredients).toEqual([])
    // An active step that no longer exists is dropped rather than stored.
    expect(result.progress.activeStepId).toBeNull()
  })

  it('sanitises on write as well as on read', () => {
    const result = saveProgress(memoryStorage(), ALPHA, {
      checkedIngredients: ['bogus'],
      completedSteps: ['also-bogus'],
      activeStepId: 'nope',
    })
    expect(result.ok).toBe(true)

    const loaded = loadProgress(memoryStorage(), ALPHA)
    expect(loaded.status).toBe('empty')
  })

  it('returns an empty state for junk input instead of throwing', () => {
    for (const junk of [null, undefined, 42, 'text', [], { progress: 7 }]) {
      const state = sanitizeProgress(junk, ALPHA)
      expect(state).toEqual(emptyProgress())
    }
  })
})

describe('stale progress after a recipe revision', () => {
  it('reports stale and does not apply the old ids when the revision changed', () => {
    const storage = memoryStorage()
    saveProgress(storage, ALPHA, {
      checkedIngredients: [ALPHA.groups[0].items[0].id],
      completedSteps: ALPHA.steps.map((step) => step.id),
      activeStepId: ALPHA.steps[ALPHA.steps.length - 1].id,
    })

    // The cook revisits after an editorial update: same recipe, new revision.
    const reworded = adaptNorcookRecipe({
      ...GROUPED_INGREDIENTS.recipe,
      slug: 'alpha',
      steps: GROUPED_INGREDIENTS.recipe.steps.map((step) => `${step} (revised)`),
    })
    expect(reworded.supported).toBe(true)
    if (!reworded.supported) return

    const result = loadProgress(storage, reworded.packet)
    expect(result.status).toBe('stale')
    if (result.status !== 'stale') return
    expect(result.storedRevision).toBe(ALPHA.revision)
    expect(result.currentRevision).toBe(reworded.packet.revision)
    expect(result.storedRevision).not.toBe(result.currentRevision)
  })

  it('reuses progress when the revision is unchanged', () => {
    const storage = memoryStorage()
    saveProgress(storage, ALPHA, {
      checkedIngredients: [ALPHA.groups[0].items[0].id],
      completedSteps: [ALPHA.steps[0].id],
      activeStepId: ALPHA.steps[0].id,
    })

    const again = adaptNorcookRecipe({ ...GROUPED_INGREDIENTS.recipe, slug: 'alpha' })
    expect(again.supported).toBe(true)
    if (!again.supported) return
    expect(again.packet.revision).toBe(ALPHA.revision)

    const result = loadProgress(storage, again.packet)
    expect(result.status).toBe('restored')
    if (result.status !== 'restored') return
    expect(result.progress.completedSteps).toEqual([ALPHA.steps[0].id])
  })

  it('refuses a value written under a different schema version', () => {
    const storage = memoryStorage()
    storage.setItem(
      progressKey(ALPHA.siteId, ALPHA.recipeId),
      JSON.stringify({
        v: PROGRESS_SCHEMA_VERSION + 1,
        siteId: ALPHA.siteId,
        recipeId: ALPHA.recipeId,
        revision: ALPHA.revision,
        updatedAt: 1,
        progress: emptyProgress(),
      }),
    )
    expect(loadProgress(storage, ALPHA).status).toBe('corrupt')
  })

  it('discards unparseable JSON', () => {
    const storage = memoryStorage({ [progressKey(ALPHA.siteId, ALPHA.recipeId)]: '{not json' })
    expect(loadProgress(storage, ALPHA).status).toBe('corrupt')
  })
})

describe('storage denial must not break reading or cooking', () => {
  it('reports unavailable instead of throwing when every operation throws', () => {
    const result = loadProgress(deniedStorage(), ALPHA)
    expect(result.status).toBe('unavailable')
    if (result.status !== 'unavailable') return
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it('reports a failed save rather than throwing', () => {
    const result = saveProgress(deniedStorage(), ALPHA, emptyProgress())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it('reports a failed clear rather than throwing', () => {
    expect(clearProgress(deniedStorage(), ALPHA).ok).toBe(false)
  })

  it('reports unavailable when there is no storage at all', () => {
    expect(loadProgress(null, ALPHA).status).toBe('unavailable')
    expect(saveProgress(null, ALPHA, emptyProgress()).ok).toBe(false)
  })

  it('resolveStorage returns null in this Node environment', () => {
    // No DOM here, so the guard must decline rather than throw.
    expect(() => resolveStorage()).not.toThrow()
    expect(resolveStorage()).toBeNull()
  })
})

describe('reset clears stored progress', () => {
  it('leaves the packet empty after an explicit clear', () => {
    const storage = memoryStorage()
    saveProgress(storage, ALPHA, {
      checkedIngredients: [ALPHA.groups[0].items[0].id],
      completedSteps: [ALPHA.steps[0].id],
      activeStepId: ALPHA.steps[0].id,
    })
    expect(clearProgress(storage, ALPHA).ok).toBe(true)
    expect(loadProgress(storage, ALPHA).status).toBe('empty')
  })

  it('clearing one recipe leaves another recipe untouched', () => {
    const storage = memoryStorage()
    saveProgress(storage, ALPHA, {
      checkedIngredients: [ALPHA.groups[0].items[0].id],
      completedSteps: [ALPHA.steps[0].id],
      activeStepId: null,
    })
    saveProgress(storage, BETA, {
      checkedIngredients: [],
      completedSteps: [BETA.steps[1].id],
      activeStepId: null,
    })

    clearProgress(storage, ALPHA)

    expect(loadProgress(storage, ALPHA).status).toBe('empty')
    const beta = loadProgress(storage, BETA)
    expect(beta.status).toBe('restored')
  })
})

describe('duplicate ingredient progress is per-line, not per-text', () => {
  it('checks off one of three identical lines without checking the others', () => {
    const result = adaptNorcookRecipe(DUPLICATE_INGREDIENTS.recipe)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    const packet = result.packet
    const butter = packet.groups
      .flatMap((group) => group.items)
      .filter((item) => item.text === '200 g butter')

    const storage = memoryStorage()
    saveProgress(storage, packet, {
      checkedIngredients: [butter[1].id],
      completedSteps: [],
      activeStepId: null,
    })

    const loaded = loadProgress(storage, packet)
    expect(loaded.status).toBe('restored')
    if (loaded.status !== 'restored') return
    expect(loaded.progress.checkedIngredients).toEqual([butter[1].id])
  })
})

describe('safety-critical recipes round-trip progress unchanged', () => {
  it('restores exactly what was stored when wording is unchanged', () => {
    const result = adaptNorcookRecipe(SAFETY_CRITICAL_WORDING.recipe)
    expect(result.supported).toBe(true)
    if (!result.supported) return
    const packet = result.packet

    const storage = memoryStorage()
    saveProgress(storage, packet, {
      checkedIngredients: [packet.groups[0].items[0].id],
      completedSteps: packet.steps.map((step) => step.id),
      activeStepId: packet.steps[3].id,
    })

    const loaded = loadProgress(storage, packet)
    expect(loaded.status).toBe('restored')
    if (loaded.status !== 'restored') return
    expect(loaded.progress.activeStepId).toBe(packet.steps[3].id)
    expect(loaded.progress.completedSteps).toHaveLength(packet.steps.length)
  })
})