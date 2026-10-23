'use client'

/**
 * One-time boot read of device-local progress.
 *
 * Stored progress is an **external store**: it exists before React mounts and
 * changes outside React (another tab, a reset, a browser restore). Reading it in
 * an effect and calling `setState` would re-render the whole recipe body twice
 * on every page load, and trips `react-hooks/set-state-in-effect`.
 *
 * `useSyncExternalStore` is the primitive designed for exactly this. It gives:
 *
 * - a server snapshot, so the server-rendered HTML and the hydration render
 *   agree and no hydration mismatch is produced;
 * - a cached client snapshot with stable identity, so repeated reads do not
 *   loop React;
 * - a subscription, so an explicit reset can invalidate the cache.
 *
 * The cache is keyed by site, recipe **and content revision**. Navigating to a
 * different recipe re-reads rather than reusing another recipe's boot result,
 * which is what keeps one recipe's progress out of another's.
 */

import { clearProgress, emptyProgress, loadProgress, resolveStorage } from './index'
import type { CookingPacket, LoadResult, ProgressState, StorageLike } from './index'

export type BootState = {
  /** False during the server render and the hydration render. */
  enhanced: boolean
  storage: StorageLike | null
  load: LoadResult
  /** Stored progress when it was restored; otherwise empty. */
  progress: ProgressState
}

/** Deterministic result used for the server render and the hydration render. */
const SERVER_BOOT: BootState = {
  enhanced: false,
  storage: null,
  load: { status: 'empty' },
  progress: emptyProgress(),
}

let cache: { key: string; value: BootState } | null = null
const listeners = new Set<() => void>()

function bootKey(packet: CookingPacket): string {
  return `${packet.siteId} ${packet.recipeId} ${packet.revision}`
}

/** Server snapshot. Stable identity — required by `useSyncExternalStore`. */
export function getServerBoot(): BootState {
  return SERVER_BOOT
}

/**
 * Client snapshot. Computes at most once per site/recipe/revision, then returns
 * the identical object until invalidated.
 */
export function getBoot(packet: CookingPacket): BootState {
  const key = bootKey(packet)
  if (cache && cache.key === key) return cache.value

  const storage = resolveStorage()
  const load: LoadResult = storage
    ? loadProgress(storage, packet)
    : { status: 'unavailable', reason: 'This browser is blocking local storage.' }

  const value: BootState = {
    enhanced: true,
    storage,
    load,
    progress: load.status === 'restored' ? load.progress : emptyProgress(),
  }
  cache = { key, value }
  return value
}

/** Subscription handle for `useSyncExternalStore`. */
export function subscribeBoot(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Drops the cached snapshot and notifies subscribers, so a later read cannot
 * resurrect progress the cook has just cleared.
 */
export function invalidateBoot(): void {
  cache = null
  for (const listener of listeners) listener()
}

/** Clears stored progress for a packet without touching React state. */
export function resetStoredProgress(
  storage: StorageLike | null,
  packet: CookingPacket,
): void {
  clearProgress(storage, packet)
  invalidateBoot()
}