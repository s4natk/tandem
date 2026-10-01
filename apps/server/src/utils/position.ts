/**
 * Sparse positions ("fractional indexing-lite").
 *
 * Cards and columns are ordered by a Float `position`. Inserting between two
 * siblings uses the midpoint of their positions, so reordering only mutates
 * a single row instead of renumbering an entire list.
 *
 * Edge cases:
 *   - inserting at the very start uses (prev = 0) and (next = head.position)
 *   - inserting at the very end uses (prev = tail.position) and (next = null)
 *   - when positions collide (very high write contention) we fall back to a
 *     normalization pass; callers should detect this and request a rebalance
 *     via `needsRebalance`.
 */

export const POSITION_STEP = 1024;
export const POSITION_EPSILON = 1e-6;

export function positionForAppend(lastPosition: number | null): number {
  if (lastPosition == null) return POSITION_STEP;
  return lastPosition + POSITION_STEP;
}

export function positionBetween(prev: number | null, next: number | null): number {
  if (prev == null && next == null) return POSITION_STEP;
  if (prev == null && next != null) return next / 2;
  if (prev != null && next == null) return prev + POSITION_STEP;
  return (prev! + next!) / 2;
}

/**
 * Returns true when two siblings collapsed close enough that future inserts
 * would lose precision. Callers should rebalance the surrounding rows.
 */
export function needsRebalance(prev: number, next: number): boolean {
  return Math.abs(next - prev) < POSITION_EPSILON;
}
