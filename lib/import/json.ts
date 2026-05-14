import type { MindMapData, MindMapNode } from '../types';
import type { ImportResult } from './index';

// JSON import for SquishyMind's own export format. Validates the shape
// strictly — anything not matching the MindMapData contract gets rejected
// with a useful message rather than silently producing a broken map.

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(msg: string): never {
  throw new Error(`Not a valid SquishyMind JSON export: ${msg}`);
}

function validateNode(id: string, raw: unknown): MindMapNode {
  if (!isObj(raw)) fail(`node "${id}" is not an object.`);
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || r.id.length === 0) fail(`node "${id}" missing id.`);
  if (typeof r.label !== 'string') fail(`node "${id}" missing label.`);
  if (typeof r.x !== 'number' || typeof r.y !== 'number') {
    fail(`node "${id}" missing numeric x/y.`);
  }
  if (r.parentId !== null && typeof r.parentId !== 'string') {
    fail(`node "${id}" parentId must be string or null.`);
  }
  if (typeof r.depth !== 'number') fail(`node "${id}" missing depth.`);
  if (typeof r.colorIdx !== 'number') fail(`node "${id}" missing colorIdx.`);
  return {
    id: r.id,
    label: r.label,
    x: r.x,
    y: r.y,
    parentId: r.parentId as string | null,
    depth: r.depth,
    colorIdx: r.colorIdx,
    note: typeof r.note === 'string' ? r.note : '',
    createdAt:
      typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    imageUrl:
      typeof r.imageUrl === 'string' || r.imageUrl === null
        ? (r.imageUrl as string | null | undefined)
        : undefined,
  };
}

export function parseSquishyMindJson(text: string, fileName?: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'malformed JSON';
    throw new Error(`JSON parse failed: ${msg}`);
  }
  if (!isObj(raw)) fail('top-level value is not an object.');

  // Allow either { nodes, childIndex, rootId } directly, or { data: {…} }
  // (in case someone exported the whole mindmap row from Supabase).
  const shape =
    'nodes' in raw ? raw : isObj(raw.data) ? (raw.data as Record<string, unknown>) : null;
  if (!shape) fail('missing "nodes" field (or "data" wrapper).');

  if (!isObj(shape.nodes)) fail('"nodes" must be an object keyed by id.');
  if (!isObj(shape.childIndex)) fail('"childIndex" must be an object.');
  if (shape.rootId !== null && typeof shape.rootId !== 'string') {
    fail('"rootId" must be a string or null.');
  }

  const nodes: Record<string, MindMapNode> = {};
  for (const [id, value] of Object.entries(shape.nodes as Record<string, unknown>)) {
    nodes[id] = validateNode(id, value);
  }

  // Validate child-index entries point to known nodes; drop dangling refs
  // rather than throwing — a partial export is still useful.
  const childIndex: Record<string, string[]> = {};
  for (const [parentId, list] of Object.entries(
    shape.childIndex as Record<string, unknown>,
  )) {
    if (!Array.isArray(list)) continue;
    const cleaned = list.filter(
      (cid): cid is string => typeof cid === 'string' && cid in nodes,
    );
    if (cleaned.length > 0) childIndex[parentId] = cleaned;
  }

  const rootId = (shape.rootId as string | null) ?? null;
  if (rootId !== null && !(rootId in nodes)) {
    fail(`rootId "${rootId}" points to a node that doesn't exist.`);
  }

  const data: MindMapData = { nodes, childIndex, rootId };
  const title =
    typeof (raw as Record<string, unknown>).title === 'string'
      ? ((raw as Record<string, unknown>).title as string)
      : rootId
        ? nodes[rootId].label
        : fileNameToTitle(fileName);

  return { data, suggestedTitle: title };
}

function fileNameToTitle(fileName?: string): string {
  if (!fileName) return 'Imported map';
  const stem = fileName.split('/').pop() ?? fileName;
  return stem.replace(/\.[^.]+$/, '') || 'Imported map';
}
