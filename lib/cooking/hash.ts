/**
 * Deterministic, dependency-free string hashing.
 *
 * This is a **change detector, not a security primitive**. It exists so that a
 * recipe's content revision changes when its published wording changes. It is
 * not collision-resistant against a motivated attacker and must never be used
 * for integrity, authentication or deduplication of untrusted input.
 *
 * It is a 128-bit FNV-1a variant run over four independently salted passes and
 * concatenated. FNV-1a is used rather than a BigInt or crypto digest so the same
 * function runs identically in the browser, in a server component and in a plain
 * Node script, with no runtime dependency and no async boundary.
 */

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** Four fixed salts. Distinct salts keep the passes from agreeing trivially. */
const SALTS = ['nc1:', 'nc2:', 'nc3:', 'nc4:'] as const

function fnv1a(input: string, seed: number): number {
  let hash = seed >>> 0
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }
  return hash >>> 0
}

/**
 * Returns a stable 32-character hex digest of `input`.
 *
 * Stable across processes and platforms: no `Math.random`, no `Date`, and no
 * dependence on object key order or locale collation.
 */
export function stableHash(input: string): string {
  let out = ''
  for (const salt of SALTS) {
    const digest = fnv1a(salt + input, FNV_OFFSET)
    out += digest.toString(16).padStart(8, '0')
  }
  return out
}