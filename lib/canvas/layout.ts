/** Pure geometry / layout helpers used by the imperative canvas. Extracted
 *  from MindMapCanvas.tsx as a first slice of breaking that file up. None
 *  of these close over canvas state — they take whatever they need as
 *  parameters and return new values (or mutate the passed-in record). */

import type { MindMapData, MindMapNode } from '@/lib/types';

/** Number of distinct colour slots a node's `colorIdx` can land in. Kept
 *  in sync with `--accent-1` … `--accent-5` CSS variables on `.smm-root`. */
export const COLOR_COUNT = 5;

/** Deep clone via JSON round-trip. Fine here because MindMapData is a
 *  plain tree of strings/numbers — no class instances, no Dates. */
export function cloneData(d: MindMapData): MindMapData {
  return {
    nodes: JSON.parse(JSON.stringify(d.nodes || {})),
    childIndex: JSON.parse(JSON.stringify(d.childIndex || {})),
    rootId: d.rootId,
  };
}

/** Find the next free `nN` id. Scans existing nodes for the highest N
 *  and returns max+1. Cheap because beta maps are dozens of nodes, not
 *  millions. */
export function nextIdFromNodes(nodes: Record<string, MindMapNode>): number {
  let max = 0;
  for (const id of Object.keys(nodes)) {
    const m = id.match(/^n(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** Bezier curve path from (x1,y1) to (x2,y2) with a small perpendicular
 *  wave so the edges feel alive without being seasick. `t` is wall-clock
 *  time (animates the wiggle); `phase` is a per-edge offset so adjacent
 *  edges don't oscillate in lockstep. */
export function curvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t = 0,
  phase = 0,
): string {
  const dx = (x2 - x1) * 0.5;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const amp = Math.min(18, length * 0.07);
  const nx = -(y2 - y1) / (length || 1);
  const ny = (x2 - x1) / (length || 1);
  const w1 = Math.sin(t * 1.2 + phase) * amp;
  const w2 = Math.sin(t * 1.5 + phase + 1.7) * amp;
  const c1x = x1 + dx + nx * w1;
  const c1y = y1 + 0 + ny * w1;
  const c2x = x2 - dx + nx * w2;
  const c2y = y2 - 0 + ny * w2;
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

/** Minimum distance between any two node centres before placeChildAtAngle
 *  pushes the new one further out. */
export const MIN_NODE_SEPARATION = 140;
/** Step size when nudging a colliding node outward along its angle. */
export const PUSH_STEP = 30;
/** Hard cap on outward pushes so a maximally-crowded canvas can't infinite-
 *  loop into infinity. */
export const MAX_PUSH_STEPS = 12;

/** Does (x, y) collide with any other node's centre (within MIN_NODE_SEPARATION)? */
export function nodeOverlaps(
  nodes: Record<string, MindMapNode>,
  x: number,
  y: number,
  ignoreId: string,
): boolean {
  for (const id in nodes) {
    if (id === ignoreId) continue;
    const other = nodes[id];
    if (!other) continue;
    if (Math.hypot(x - other.x, y - other.y) < MIN_NODE_SEPARATION) return true;
  }
  return false;
}

/** Place a child at the given angle from `parent`, pushing outward if it
 *  collides with anything until a clear spot is found (or MAX_PUSH_STEPS
 *  is hit). Mutates the child node in-place. */
export function placeChildAtAngle(
  nodes: Record<string, MindMapNode>,
  parent: MindMapNode,
  childId: string,
  angle: number,
  startDistance: number,
): void {
  const child = nodes[childId];
  if (!child) return;
  let distance = startDistance;
  let x = parent.x + Math.cos(angle) * distance;
  let y = parent.y + Math.sin(angle) * distance;
  let steps = 0;
  while (nodeOverlaps(nodes, x, y, childId) && steps < MAX_PUSH_STEPS) {
    distance += PUSH_STEP;
    x = parent.x + Math.cos(angle) * distance;
    y = parent.y + Math.sin(angle) * distance;
    steps++;
  }
  child.x = x;
  child.y = y;
}

/** Redistribute every child of `parentId` evenly along the parent's
 *  outward arc, then push each outward until it clears nearby nodes.
 *  Called after batch creates (voice, AI expand, template apply) so the
 *  pile of new nodes doesn't stack on top of each other at the +arc edge.
 *
 *  The root gets a full-circle distribution (6 reserved slots so a brain
 *  with 1–5 children doesn't crowd onto one hemisphere). Non-root parents
 *  fan their children out on a 120° arc opening away from grandparent. */
export function layoutChildren(
  data: MindMapData,
  parentId: string,
): void {
  const parent = data.nodes[parentId];
  if (!parent) return;
  const siblingIds = data.childIndex[parentId] || [];
  const total = siblingIds.length;
  if (total === 0) return;
  const baseDistance = parent.depth === 0 ? 220 : 180;

  if (parent.parentId == null) {
    // Root — full-circle distribution. Reserve 6 slots so a brain with
    // 1–5 children doesn't crowd onto a single hemisphere.
    const slots = Math.max(total, 6);
    for (let i = 0; i < total; i++) {
      const angle = (i / slots) * Math.PI * 2;
      placeChildAtAngle(data.nodes, parent, siblingIds[i], angle, baseDistance);
    }
    return;
  }

  // Non-root: fan out on a ~153° arc centred on the outward direction
  // (parent's angle relative to grandparent).
  const gp = parent.parentId ? data.nodes[parent.parentId] : null;
  if (!gp) return;
  const baseAngle = Math.atan2(parent.y - gp.y, parent.x - gp.x);
  const arcSpread = Math.PI * 0.85;

  if (total === 1) {
    placeChildAtAngle(data.nodes, parent, siblingIds[0], baseAngle, baseDistance);
    return;
  }

  for (let i = 0; i < total; i++) {
    const angle = baseAngle - arcSpread / 2 + (i / (total - 1)) * arcSpread;
    placeChildAtAngle(data.nodes, parent, siblingIds[i], angle, baseDistance);
  }
}

/** Strip any `links` on remaining nodes that point at ids in `deletedIds`.
 *  Called after a node + subtree delete so incoming cross-references don't
 *  rot into "(missing node)" entries in other nodes' link lists.
 *  Mutates the passed-in nodes record in place. */
export function stripIncomingLinks(
  nodes: Record<string, MindMapNode>,
  deletedIds: Set<string>,
): void {
  if (deletedIds.size === 0) return;
  for (const id in nodes) {
    const n = nodes[id];
    if (!n.links || n.links.length === 0) continue;
    const filtered = n.links.filter((l) => !deletedIds.has(l.targetId));
    if (filtered.length !== n.links.length) {
      n.links = filtered.length > 0 ? filtered : undefined;
    }
  }
}
