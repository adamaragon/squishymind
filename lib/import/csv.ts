import { buildMindMapData } from './markdown';
import type { ImportResult } from './index';

// CSV import supports two header shapes — auto-detected from the header row:
//
//   Shape A (parent_label):
//     label,parent_label,note,color_idx
//     Q4 Roadmap,,Root concept,0
//     Marketing,Q4 Roadmap,,1
//     SEO,Marketing,,2
//
//   Shape B (path):
//     path,note
//     Q4 Roadmap,Root concept
//     Q4 Roadmap > Marketing,
//     Q4 Roadmap > Marketing > SEO,
//
// The tokenizer is RFC-4180-ish: quote-aware, supports "" as an escaped
// quote inside a quoted field, handles CRLF/LF/CR newlines, and lets
// newlines appear inside quoted fields. No external dependency.

type ParsedNode = {
  label: string;
  note: string;
  colorIdx?: number;
  children: ParsedNode[];
};

function newParsed(label: string): ParsedNode {
  return { label, note: '', children: [] };
}

/** Tokenize a CSV document into a 2-D array of cell strings. */
function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote.
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }

    if (ch === '"' && cell === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // Swallow; the following \n (if any) ends the row.
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += ch;
    i++;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function filenameToTitle(fileName?: string): string {
  if (!fileName) return 'Imported map';
  const stem = fileName.split('/').pop() ?? fileName;
  return stem.replace(/\.[^.]+$/, '') || 'Imported map';
}

function parseColorIdx(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n)) return undefined;
  return ((Math.floor(n) % 5) + 5) % 5;
}

/**
 * Shape A — flat rows with a parent_label column. Ambiguity rule: if two
 * nodes share a label, parent_label resolves to the FIRST matching node.
 * Users wanting unambiguous resolution should give nodes unique labels.
 */
function parseShapeA(
  headers: string[],
  rows: string[][],
  fileName?: string,
): ImportResult {
  const idx = {
    label: headers.indexOf('label'),
    parent: headers.indexOf('parent_label'),
    note: headers.indexOf('note'),
    colorIdx: headers.indexOf('color_idx'),
  };

  type Item = {
    label: string;
    parent: string;
    note: string;
    colorIdx?: number;
  };
  const items: Item[] = rows
    .map((r) => ({
      label: (r[idx.label] ?? '').trim(),
      parent: idx.parent >= 0 ? (r[idx.parent] ?? '').trim() : '',
      note: idx.note >= 0 ? (r[idx.note] ?? '').trim() : '',
      colorIdx: idx.colorIdx >= 0 ? parseColorIdx(r[idx.colorIdx]) : undefined,
    }))
    .filter((it) => it.label.length > 0);

  if (items.length === 0) {
    throw new Error('CSV has no rows with a non-empty label column.');
  }

  // Build a ParsedNode per item. First occurrence of a label wins when
  // parent lookups are ambiguous.
  const byLabel = new Map<string, ParsedNode>();
  const nodes: ParsedNode[] = items.map((it) => {
    const n = newParsed(it.label);
    n.note = it.note;
    n.colorIdx = it.colorIdx;
    if (!byLabel.has(it.label)) byLabel.set(it.label, n);
    return n;
  });

  // Link children to parents using the original Item order.
  const rootCandidates: ParsedNode[] = [];
  items.forEach((it, i) => {
    const node = nodes[i];
    if (!it.parent) {
      rootCandidates.push(node);
      return;
    }
    const parent = byLabel.get(it.parent);
    if (parent) {
      parent.children.push(node);
    } else {
      // Unknown parent — treat as another root rather than dropping the row.
      rootCandidates.push(node);
    }
  });

  let mapRoot: ParsedNode;
  let suggestedTitle: string;
  if (rootCandidates.length === 1) {
    mapRoot = rootCandidates[0];
    suggestedTitle = mapRoot.label;
  } else {
    mapRoot = newParsed(filenameToTitle(fileName));
    mapRoot.children = rootCandidates;
    suggestedTitle = mapRoot.label;
  }

  return { data: buildMindMapData(mapRoot), suggestedTitle };
}

/**
 * Shape B — each row's path field is a chain of labels separated by ' > '.
 * Notes attach to the leaf segment. Common prefixes merge into shared nodes.
 */
function parseShapeB(
  headers: string[],
  rows: string[][],
  fileName?: string,
): ImportResult {
  const idx = {
    path: headers.indexOf('path'),
    note: headers.indexOf('note'),
    colorIdx: headers.indexOf('color_idx'),
  };

  type Item = { path: string[]; note: string; colorIdx?: number };
  const items: Item[] = [];
  for (const r of rows) {
    const raw = (r[idx.path] ?? '').trim();
    if (!raw) continue;
    const segments = raw
      .split(/\s*>\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (segments.length === 0) continue;
    const item: Item = {
      path: segments,
      note: idx.note >= 0 ? (r[idx.note] ?? '').trim() : '',
    };
    if (idx.colorIdx >= 0) {
      const c = parseColorIdx(r[idx.colorIdx]);
      if (c !== undefined) item.colorIdx = c;
    }
    items.push(item);
  }

  if (items.length === 0) {
    throw new Error('CSV has no rows with a non-empty path column.');
  }

  // Build the tree by walking each path and reusing existing nodes for
  // shared prefixes.
  const synthetic = newParsed('');
  let actualRoot: ParsedNode | null = null;

  for (const item of items) {
    let cursor = synthetic;
    item.path.forEach((segment, i) => {
      let existing = cursor.children.find((c) => c.label === segment);
      if (!existing) {
        existing = newParsed(segment);
        cursor.children.push(existing);
      }
      cursor = existing;
      // Attach note + color to the leaf node only.
      if (i === item.path.length - 1) {
        if (item.note && !cursor.note) cursor.note = item.note;
        if (item.colorIdx !== undefined) cursor.colorIdx = item.colorIdx;
      }
    });
  }

  let mapRoot: ParsedNode;
  let suggestedTitle: string;
  if (synthetic.children.length === 1) {
    mapRoot = synthetic.children[0];
    actualRoot = mapRoot;
    suggestedTitle = mapRoot.label;
  } else {
    mapRoot = newParsed(filenameToTitle(fileName));
    mapRoot.children = synthetic.children;
    suggestedTitle = mapRoot.label;
  }
  void actualRoot;

  return { data: buildMindMapData(mapRoot), suggestedTitle };
}

export function parseCsv(text: string, fileName?: string): ImportResult {
  const rows = tokenize(text);
  if (rows.length === 0) {
    throw new Error('CSV is empty.');
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim().length > 0));
  if (dataRows.length === 0) {
    throw new Error('CSV needs at least one data row beneath the header.');
  }

  if (headers.includes('label')) {
    return parseShapeA(headers, dataRows, fileName);
  }
  if (headers.includes('path')) {
    return parseShapeB(headers, dataRows, fileName);
  }
  throw new Error(
    'CSV header row must include a "label" column (with optional parent_label/note/color_idx) or a "path" column.',
  );
}
