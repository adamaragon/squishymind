import type { MindMapData, MindMapNode } from '../types';
import type { ImportResult } from './index';

// Parse a Markdown document into MindMapData.
//
// Strategy:
//   * If the document has at least one ATX heading (`# Title` etc.), the
//     topmost level becomes the root; every deeper heading nests under its
//     immediate preceding heading of a lower depth (standard outliner rules).
//   * Within a heading section, bullet/numbered list items become children
//     of that heading. Indentation depth (tabs OR 2/4 spaces) determines
//     hierarchy among list items.
//   * If the document has no headings, the filename (sans extension) becomes
//     the root and the top-level bullets become first-level branches.
//   * Plain prose lines that appear immediately after a heading or list item
//     become the previous node's `note` field (joined with blank-line breaks).
//
// We deliberately do not pull in a markdown library — these inputs are
// well-formed and we only care about three shapes (heading, list item,
// plain line).

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const LIST_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+(.+?)\s*$/;
const FENCE_RE = /^\s*```/;

type ParsedNode = {
  label: string;
  note: string;
  children: ParsedNode[];
};

function newParsed(label: string): ParsedNode {
  return { label, note: '', children: [] };
}

function indentToDepth(indent: string): number {
  // Tabs count as one level. Spaces: 2 or 4 per level — auto-detect by the
  // first non-zero indent. Conservative: 2 spaces = one level, but each set
  // of 4 spaces still counts as 2 levels (so 4-space indenters get a tree
  // that's twice as deep but the relative shape is preserved).
  let depth = 0;
  for (const ch of indent) {
    if (ch === '\t') depth += 1;
    else if (ch === ' ') depth += 0.5; // pairs to 1 per 2 spaces
  }
  return Math.floor(depth);
}

export function parseMarkdown(text: string, fileName?: string): ImportResult {
  // Normalise line endings and strip code fences (we don't want list-looking
  // content inside ``` blocks to be parsed as nodes).
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];
  let inFence = false;
  for (const line of rawLines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    lines.push(line);
  }

  // ---- First pass: detect whether we have any headings at all ----
  const hasHeading = lines.some((l) => HEADING_RE.test(l));

  // Build a parsed tree. Heading levels are 1..6; list items get nested
  // under whichever heading they currently live under.
  const root: ParsedNode = newParsed('');
  // Stack of (depth, node) where depth is the effective hierarchy depth.
  // Headings occupy depths 0..5 (h1=0, h2=1, ...). List items inside a
  // heading section get pushed onto the stack with depths starting at the
  // section's depth + 1.
  const stack: Array<{ depth: number; node: ParsedNode }> = [
    { depth: -1, node: root },
  ];

  const noteRef: { current: ParsedNode | null } = { current: null };

  function pushAt(depth: number, node: ParsedNode) {
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1] || { node: root };
    parent.node.children.push(node);
    stack.push({ depth, node });
    noteRef.current = node;
  }

  // Section depth tracks the depth where the most recent heading lives so
  // list items inside that section nest UNDER it.
  let headingSectionDepth = -1;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) {
      // Blank line — note-collection continues across one blank line; resets
      // the "next plain line is a note" expectation only if we see two in a row.
      noteRef.current = null;
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length; // 1..6
      const label = headingMatch[2].trim();
      const node = newParsed(label);
      const depth = level - 1; // h1 -> 0
      pushAt(depth, node);
      headingSectionDepth = depth;
      continue;
    }

    const listMatch = line.match(LIST_RE);
    if (listMatch) {
      const indent = listMatch[1];
      const label = listMatch[2].trim();
      const node = newParsed(label);
      const listDepth = indentToDepth(indent);
      // List items live under the current heading section (if any).
      const effectiveDepth = Math.max(headingSectionDepth, -1) + 1 + listDepth;
      pushAt(effectiveDepth, node);
      continue;
    }

    // Plain line — append to the most recently created node's note.
    const target = noteRef.current;
    if (target) {
      target.note = target.note ? `${target.note}\n${line.trim()}` : line.trim();
    }
  }

  // ---- Determine the root node ----
  // If we have headings, the natural root is the first child of root if it's
  // a single h1. Otherwise wrap the headings under a synthetic root.
  let mapRoot: ParsedNode;
  let suggestedTitle: string;
  if (hasHeading && root.children.length === 1) {
    mapRoot = root.children[0];
    suggestedTitle = mapRoot.label || filenameToTitle(fileName);
  } else if (root.children.length === 0) {
    mapRoot = newParsed(filenameToTitle(fileName));
    suggestedTitle = mapRoot.label;
  } else {
    mapRoot = newParsed(filenameToTitle(fileName));
    mapRoot.children = root.children;
    suggestedTitle = mapRoot.label;
  }

  return { data: buildMindMapData(mapRoot), suggestedTitle };
}

function filenameToTitle(fileName?: string): string {
  if (!fileName) return 'Imported map';
  const stem = fileName.split('/').pop() ?? fileName;
  return stem.replace(/\.[^.]+$/, '') || 'Imported map';
}

// Convert the ParsedNode tree into MindMapData with auto-positioned nodes.
// Layout: root at origin; first level on a circle; deeper levels fan out
// from their parent at decreasing radii. Same shape the canvas would build
// from scratch — switching to canvas view will look right immediately.
export function buildMindMapData(rootParsed: ParsedNode): MindMapData {
  const nodes: Record<string, MindMapNode> = {};
  const childIndex: Record<string, string[]> = {};
  let counter = 1;
  const nextId = () => `n${counter++}`;
  const now = Date.now();

  function place(
    parsed: ParsedNode,
    parentId: string | null,
    depth: number,
    angle: number,
    radius: number,
    colorIdx: number,
  ): string {
    const id = nextId();
    const parent = parentId ? nodes[parentId] : null;
    const x = parent ? parent.x + Math.cos(angle) * radius : 0;
    const y = parent ? parent.y + Math.sin(angle) * radius : 0;
    nodes[id] = {
      id,
      label: parsed.label || 'Untitled',
      x,
      y,
      parentId,
      depth,
      colorIdx,
      note: parsed.note,
      createdAt: now,
    };
    if (parentId) {
      (childIndex[parentId] = childIndex[parentId] || []).push(id);
    }
    const kids = parsed.children;
    const childRadius = depth === 0 ? 220 : 180;
    if (depth === 0) {
      // First level: distribute around full circle. Reserve 6 slots so a
      // small set doesn't crowd one hemisphere.
      const slots = Math.max(kids.length, 6);
      kids.forEach((kid, i) => {
        const a = (i / slots) * Math.PI * 2;
        place(kid, id, depth + 1, a, childRadius, (i + 1) % 5);
      });
    } else {
      // Deeper: arc on the outward side of the parent.
      const arc = Math.PI * 0.85;
      const baseAngle = angle;
      if (kids.length === 1) {
        place(kids[0], id, depth + 1, baseAngle, childRadius, (colorIdx + 1) % 5);
      } else if (kids.length > 1) {
        kids.forEach((kid, i) => {
          const a = baseAngle - arc / 2 + (i / (kids.length - 1)) * arc;
          place(kid, id, depth + 1, a, childRadius, (colorIdx + i + 1) % 5);
        });
      }
    }
    return id;
  }

  const rootId = place(rootParsed, null, 0, 0, 0, 0);
  return { nodes, childIndex, rootId };
}
