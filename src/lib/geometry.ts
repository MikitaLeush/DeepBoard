export interface Box {
  x: number
  y: number
  w: number
  h: number
}
export interface Pt {
  x: number
  y: number
}

export type Side = 'top' | 'right' | 'bottom' | 'left'
export const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left']
export const isSide = (v: unknown): v is Side => (SIDES as readonly unknown[]).includes(v)

/** Outward unit normal of each side: the direction a connector leaves/enters in. */
const NORMAL: Record<Side, Pt> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } }

/** Back-to-front order for notes: z, then creation time, then id (so the order never depends on edit order). */
export function stackOrder(a: { recordId: string; createdAt?: string; data: { z?: number } }, b: typeof a): number {
  return (
    (Number(a.data.z) || 0) - (Number(b.data.z) || 0) ||
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
    a.recordId.localeCompare(b.recordId)
  )
}

/** A note belongs to a group when its centre is inside the group's box. Shared by client and server. */
export function centerIn(n: Box, g: Box): boolean {
  const cx = n.x + n.w / 2
  const cy = n.y + n.h / 2
  return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h
}

/** Middle of one side of a box: the four places an arrow can attach. */
export function anchor(b: Box, s: Side): Pt {
  switch (s) {
    case 'top':
      return { x: b.x + b.w / 2, y: b.y }
    case 'bottom':
      return { x: b.x + b.w / 2, y: b.y + b.h }
    case 'left':
      return { x: b.x, y: b.y + b.h / 2 }
    case 'right':
      return { x: b.x + b.w, y: b.y + b.h / 2 }
  }
}

/** Which side's anchor is closest to a point (used to snap a dragged arrow end onto a note). */
export function nearestSide(b: Box, px: number, py: number): Side {
  let best: Side = 'top'
  let bd = Infinity
  for (const s of SIDES) {
    const a = anchor(b, s)
    const d = Math.hypot(a.x - px, a.y - py)
    if (d < bd) (bd = d), (best = s)
  }
  return best
}

/** Facing sides for arrows saved without explicit sides (older arrows). Returns [fromSide, toSide]. */
export function autoSides(a: Box, b: Box): [Side, Side] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2)
  const dy = b.y + b.h / 2 - (a.y + a.h / 2)
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['right', 'left'] : ['left', 'right']
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom']
}

/**
 * Smooth S-shaped connector: a cubic Bézier that leaves p1 perpendicular to its side and arrives at p2
 * perpendicular to its side (`s2` null = free end, e.g. while dragging). `mid` is the curve's midpoint.
 */
export function curvePath(p1: Pt, s1: Side, p2: Pt, s2: Side | null): { d: string; mid: Pt } {
  const k = Math.min(200, Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.5))
  const c1 = { x: p1.x + NORMAL[s1].x * k, y: p1.y + NORMAL[s1].y * k }
  const c2 = s2 ? { x: p2.x + NORMAL[s2].x * k, y: p2.y + NORMAL[s2].y * k } : p2
  return {
    d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`,
    mid: { x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8, y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8 },
  }
}
