/**
 * Public surface of the cooking companion core.
 *
 * Everything exported here is framework-independent and side-effect free at
 * import time. React components live under `components/cook`; site-specific
 * adapters live under `lib/cooking/adapters`.
 *
 * Lifecycle
 * ---------
 * 1. **Adapt** — an adapter turns a site packet into a `CookingPacket`, or
 *    reports `{ supported: false }` so the caller can fall back to the ordinary
 *    recipe view.
 * 2. **Load** — `loadProgress` reads device-local progress and classifies it as
 *    `empty`, `restored`, `stale`, `unavailable` or `corrupt`. Only `restored`
 *    applies stored ids; `stale` is offered as a reset.
 * 3. **Render** — the cook companion renders `packet.groups` and `packet.steps`
 *    verbatim, in order.
 * 4. **Mutate** — every interaction produces a new `ProgressState`.
 * 5. **Save** — `saveProgress` writes it, sanitised against the packet's own
 *    ids. Failures are reported, never thrown.
 */

export type {
  AdaptationResult,
  AdapterNote,
  CookingPacket,
  IngredientGroup,
  IngredientItem,
  PacketAdapter,
  Quantity,
  RecipeStep,
  ScalingCapability,
  SiteId,
} from './types'

export { stableHash } from './hash'
export {
  DERIVED_ID_PREFIX,
  deriveGroupId,
  deriveItemId,
  deriveStepId,
  isDerivedId,
  textFingerprint,
} from './ids'
export { computeRevision, revisionInputOf } from './revision'
export type { RevisionInput } from './revision'
export { buildShoppingList } from './shopping-list'
export type { ShoppingListOptions } from './shopping-list'
export {
  DEFAULT_MULTIPLIERS,
  assessScaling,
  displayForItem,
  formatAmount,
} from './scaling'
export type { ScalingAssessment, ScalingInput } from './scaling'
export {
  PROGRESS_SCHEMA_VERSION,
  STORAGE_NAMESPACE,
  clearProgress,
  emptyProgress,
  loadProgress,
  progressKey,
  resolveStorage,
  sanitizeProgress,
  saveProgress,
} from './persistence'
export type { LoadResult, ProgressState, SaveResult, StorageLike } from './persistence'