/**
 * Device-local cooking progress.
 *
 * Progress is a convenience, never a dependency. Every function here is
 * total: storage may throw, may be absent, may be full, or may hold data written
 * by an older build or a hand-edited value, and none of those may break reading
 * or cooking controls. Failures degrade to "no stored progress" plus a reason
 * the UI can show.
 *
 * Storage key layout
 * ------------------
 * `norcook:cook:v1:<siteId>:<recipeId>`
 *
 * The key is scoped by site **and** recipe, so one recipe's progress can never
 * be read as another's. The content revision lives in the value rather than the
 * key, because a revision change must be *detected* (to offer a reset), not
 * merely missed.
 */

import type { CookingPacket } from './types'

/** Schema version of the stored value. Bump when the shape changes. */
export const PROGRESS_SCHEMA_VERSION = 1

/** Namespace prefix. Matches the site's existing `norcook-*-v1` convention. */
export const STORAGE_NAMESPACE = 'norcook:cook:v1'

/** The subset of the Web Storage API this module needs. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Persisted progress. Ids are those of the packet that was current at write time. */
export type ProgressState = {
  checkedIngredients: string[]
  completedSteps: string[]
  activeStepId: string | null
}

/** Progress with nothing recorded. Returned by value; callers must not mutate. */
export function emptyProgress(): ProgressState {
  return { checkedIngredients: [], completedSteps: [], activeStepId: null }
}

type StoredEnvelope = {
  v: number
  siteId: string
  recipeId: string
  revision: string
  updatedAt: number
  progress: ProgressState
}

export type LoadResult =
  | { status: 'empty' }
  /** Stored progress matches the packet's revision and every id is known. */
  | { status: 'restored'; progress: ProgressState }
  /** Stored progress belongs to an older or newer content revision. Not applied. */
  | { status: 'stale'; storedRevision: string; currentRevision: string }
  /** Storage exists but could not be used. Reading and cooking continue. */
  | { status: 'unavailable'; reason: string }
  /** Stored value was unreadable or from an unknown schema version. Discarded. */
  | { status: 'corrupt'; reason: string }

/** Storage key for a site/recipe pair. */
export function progressKey(siteId: string, recipeId: string): string {
  return `${STORAGE_NAMESPACE}:${encodeURIComponent(siteId)}:${encodeURIComponent(recipeId)}`
}

/**
 * Returns `window.localStorage` if it is actually usable, otherwise `null`.
 *
 * Merely reading the property can throw (Safari private browsing, sandboxed
 * iframes, disabled cookies), so the access itself is guarded, followed by a
 * write/delete probe: some browsers expose the object and only then fail.
 */
export function resolveStorage(): StorageLike | null {
  try {
    const candidate = globalThis.localStorage as StorageLike | undefined
    if (!candidate) return null
    const probe = `${STORAGE_NAMESPACE}:probe`
    candidate.setItem(probe, '1')
    candidate.removeItem(probe)
    return candidate
  } catch {
    return null
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

/**
 * Drops ids the current packet does not contain and de-duplicates.
 *
 * Accepts a progress value directly (not the storage envelope). This is the
 * anti-leak boundary. Even if a key were to collide, or a value were edited by
 * hand or restored from another recipe's backup, an id that does not exist in
 * this packet is never applied — so a cook can never be shown as having
 * completed a step they have not reached.
 */
export function sanitizeProgress(
  raw: unknown,
  packet: CookingPacket,
): ProgressState {
  const state = emptyProgress()
  if (typeof raw !== 'object' || raw === null) return state

  const validIngredientIds = new Set(
    packet.groups.flatMap((group) => group.items.map((item) => item.id)),
  )
  const validStepIds = new Set(packet.steps.map((step) => step.id))

  const checked = (raw as Partial<ProgressState>).checkedIngredients
  if (isStringArray(checked)) {
    state.checkedIngredients = [
      ...new Set(checked.filter((id) => validIngredientIds.has(id))),
    ]
  }

  const completed = (raw as Partial<ProgressState>).completedSteps
  if (isStringArray(completed)) {
    state.completedSteps = [
      ...new Set(completed.filter((id) => validStepIds.has(id))),
    ]
  }

  const active = (raw as Partial<ProgressState>).activeStepId
  if (typeof active === 'string' && validStepIds.has(active)) {
    state.activeStepId = active
  }

  return state
}

/**
 * Reads stored progress for `packet`.
 *
 * Never throws. A revision mismatch returns `stale` and the caller must offer a
 * reset rather than applying the old ids.
 */
export function loadProgress(
  storage: StorageLike | null,
  packet: CookingPacket,
): LoadResult {
  if (!storage) {
    return {
      status: 'unavailable',
      reason: 'This browser is blocking local storage.',
    }
  }

  let raw: string | null
  try {
    raw = storage.getItem(progressKey(packet.siteId, packet.recipeId))
  } catch (error) {
    return { status: 'unavailable', reason: describeError(error) }
  }

  if (raw === null) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'corrupt', reason: 'Stored progress could not be read.' }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as StoredEnvelope).v !== PROGRESS_SCHEMA_VERSION
  ) {
    return { status: 'corrupt', reason: 'Stored progress used an unknown format.' }
  }

  const envelope = parsed as StoredEnvelope
  if (
    envelope.siteId !== packet.siteId ||
    envelope.recipeId !== packet.recipeId ||
    envelope.revision !== packet.revision
  ) {
    return {
      status: 'stale',
      storedRevision: String(envelope.revision ?? 'unknown'),
      currentRevision: packet.revision,
    }
  }

  return {
    status: 'restored',
    progress: sanitizeProgress(envelope.progress, packet),
  }
}

/** Outcome of a write. `ok: false` is informational, never fatal. */
export type SaveResult = { ok: true } | { ok: false; reason: string }

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Local storage could not be used.'
}

/**
 * Writes progress for `packet`, sanitised against the packet's own ids.
 *
 * Never throws. On failure the cook keeps working with in-memory progress; the
 * caller may surface the reason.
 */
export function saveProgress(
  storage: StorageLike | null,
  packet: CookingPacket,
  progress: ProgressState,
): SaveResult {
  if (!storage) return { ok: false, reason: 'This browser is blocking local storage.' }

  const envelope: StoredEnvelope = {
    v: PROGRESS_SCHEMA_VERSION,
    siteId: packet.siteId,
    recipeId: packet.recipeId,
    revision: packet.revision,
    updatedAt: Date.now(),
    progress: sanitizeProgress(progress, packet),
  }

  try {
    storage.setItem(progressKey(packet.siteId, packet.recipeId), JSON.stringify(envelope))
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: describeError(error) }
  }
}

/** Removes stored progress for this site/recipe pair. Never throws. */
export function clearProgress(
  storage: StorageLike | null,
  packet: CookingPacket,
): SaveResult {
  if (!storage) return { ok: false, reason: 'This browser is blocking local storage.' }
  try {
    storage.removeItem(progressKey(packet.siteId, packet.recipeId))
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: describeError(error) }
  }
}