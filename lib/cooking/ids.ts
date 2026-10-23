/**
 * Deterministic id derivation for adapted packets.
 *
 * Ids must satisfy three properties, in this order of importance:
 *
 * 1. **Stable across reloads** — the same packet yields the same ids every time,
 *    so a check-off survives a refresh.
 * 2. **Stable across wording edits** — an authored rewording must not orphan
 *    stored progress. Content change is detected by `computeRevision` instead,
 *    which is the mechanism designed for that job.
 * 3. **Collision-free for duplicate text** — two identical ingredient lines must
 *    produce two distinct ids, because they are two real shopping items.
 *
 * A content-derived id would satisfy 1 and 3 but break 2. A purely ordinal id
 * satisfies all three, so ordinal ids are the default. Adapters that receive a
 * real authored id pass it through untouched.
 */

import { stableHash } from './hash'

/** Ids derived rather than authored, tagged so UI and tests can tell them apart. */
export const DERIVED_ID_PREFIX = 'd'

/** True when `id` was derived by this module rather than authored by a packet. */
export function isDerivedId(id: string): boolean {
  return id.startsWith(`${DERIVED_ID_PREFIX}:`)
}

/**
 * Collision-free id for an ingredient at a known ordinal position.
 *
 * Includes the group index so two groups may each hold a first item.
 */
export function deriveItemId(groupIndex: number, itemIndex: number): string {
  return `${DERIVED_ID_PREFIX}:ing:${groupIndex}:${itemIndex}`
}

/** Collision-free id for a group at a known ordinal position. */
export function deriveGroupId(groupIndex: number): string {
  return `${DERIVED_ID_PREFIX}:grp:${groupIndex}`
}

/**
 * Id for the step at 1-based `order`.
 *
 * Ordinal rather than content-derived so that an authored rewording keeps the
 * same id; the revision fingerprint is what flags the change to the cook.
 */
export function deriveStepId(order: number): string {
  return `${DERIVED_ID_PREFIX}:step:${order}`
}

/**
 * Short, human-legible fingerprint of authored text, for debugging ids in
 * devtools. Never used for identity.
 */
export function textFingerprint(text: string): string {
  return stableHash(text).slice(0, 6)
}