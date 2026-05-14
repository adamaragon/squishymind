import { buildMindMapData } from './markdown';
import type { ImportResult } from './index';

// OPML import. Standard outliner format used by RSS readers, podcast
// clients, and tools like OmniOutliner / Workflowy / Dynalist.
//
// We don't pull in an XML library — a focused recursive parser handles the
// subset we care about (tags, attributes, text, self-close, comments,
// processing instructions). ~120 lines, zero deps.
//
// Schema we read:
//   <opml>
//     <head><title>Map title</title></head>      ← optional brain label
//     <body>
//       <outline text="Label" _note="optional">  ← outline = node
//         <outline text="Child" />
//       </outline>
//     </body>
//   </opml>
//
// Some tools use `title` instead of `text` on outline elements; we fall
// back to that. Some use `_note` (OPML 2 convention), others store notes
// as nested text — we accept the attribute first, then look for a single
// text child.

type ParsedNode = {
  label: string;
  note: string;
  children: ParsedNode[];
};

type XmlNode = {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([\da-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  // name="value" or name='value' or bare name=value (rare in OPML).
  const re = /([\w:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s/>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const name = m[1];
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    out[name.toLowerCase()] = decodeEntities(value);
  }
  return out;
}

/** Hand-rolled XML parser. Returns the root element (the topmost tag). */
function parseXml(text: string): XmlNode {
  let i = 0;
  const n = text.length;

  function skipWhitespace() {
    while (i < n && /\s/.test(text[i])) i++;
  }

  function readUntil(delim: string): string {
    const start = i;
    const idx = text.indexOf(delim, i);
    if (idx < 0) {
      i = n;
      return text.slice(start);
    }
    i = idx;
    return text.slice(start, idx);
  }

  function parseElement(): XmlNode | null {
    // Caller has positioned i past the opening '<'.
    // Could be a normal tag, self-closing, or end tag (caller handles end).
    let tagEnd = text.indexOf('>', i);
    if (tagEnd < 0) {
      i = n;
      return null;
    }
    let inner = text.slice(i, tagEnd);
    let selfClosing = false;
    if (inner.endsWith('/')) {
      selfClosing = true;
      inner = inner.slice(0, -1);
    }
    const firstSpace = inner.search(/\s/);
    const tag = (firstSpace < 0 ? inner : inner.slice(0, firstSpace)).toLowerCase();
    const attrs = firstSpace < 0 ? {} : parseAttrs(inner.slice(firstSpace + 1));

    i = tagEnd + 1;
    const node: XmlNode = { tag, attrs, children: [], text: '' };
    if (selfClosing) return node;

    // Parse children until matching close tag.
    while (i < n) {
      // Plain text between tags accumulates.
      const lt = text.indexOf('<', i);
      if (lt < 0) {
        node.text += text.slice(i);
        i = n;
        break;
      }
      if (lt > i) {
        node.text += text.slice(i, lt);
        i = lt;
      }
      // Could be a child element, end tag, comment, CDATA, or PI.
      if (text.startsWith('<!--', i)) {
        const end = text.indexOf('-->', i + 4);
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (text.startsWith('<![CDATA[', i)) {
        const end = text.indexOf(']]>', i + 9);
        const data = end < 0 ? text.slice(i + 9) : text.slice(i + 9, end);
        node.text += data;
        i = end < 0 ? n : end + 3;
        continue;
      }
      if (text.startsWith('<?', i)) {
        const end = text.indexOf('?>', i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      }
      if (text.startsWith('</', i)) {
        // End tag — caller's responsibility to consume.
        const end = text.indexOf('>', i);
        i = end < 0 ? n : end + 1;
        return node;
      }
      // Child element.
      i++; // skip '<'
      const child = parseElement();
      if (child) node.children.push(child);
    }
    return node;
  }

  skipWhitespace();
  // Skip leading PI / comments.
  while (i < n && text.startsWith('<', i)) {
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      i = end < 0 ? n : end + 2;
      skipWhitespace();
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      i = end < 0 ? n : end + 3;
      skipWhitespace();
      continue;
    }
    if (text.startsWith('<!', i)) {
      // DOCTYPE or similar — skip to next '>'
      const end = text.indexOf('>', i);
      i = end < 0 ? n : end + 1;
      skipWhitespace();
      continue;
    }
    break;
  }
  if (!text.startsWith('<', i)) {
    throw new Error('OPML: no root element found.');
  }
  i++; // skip '<'
  const root = parseElement();
  if (!root) throw new Error('OPML: failed to parse root element.');
  return root;
}

function newParsed(label: string): ParsedNode {
  return { label, note: '', children: [] };
}

function findChild(node: XmlNode, tag: string): XmlNode | undefined {
  return node.children.find((c) => c.tag === tag);
}

function filenameToTitle(fileName?: string): string {
  if (!fileName) return 'Imported map';
  const stem = fileName.split('/').pop() ?? fileName;
  return stem.replace(/\.[^.]+$/, '') || 'Imported map';
}

function outlineToParsed(o: XmlNode): ParsedNode {
  // Prefer `text` attribute (OPML standard), fall back to `title`.
  const label = (o.attrs.text || o.attrs.title || '').trim() || 'Untitled';
  const noteAttr = (o.attrs._note || o.attrs.note || '').trim();
  const node = newParsed(label);
  node.note = noteAttr;
  for (const child of o.children) {
    if (child.tag === 'outline') {
      node.children.push(outlineToParsed(child));
    }
  }
  return node;
}

export function parseOpml(text: string, fileName?: string): ImportResult {
  const root = parseXml(text);
  if (root.tag !== 'opml') {
    // Some tools strip the wrapper. Be forgiving — if we see body directly,
    // treat it as inside an implicit opml root.
    if (root.tag !== 'body' && !findChild(root, 'body')) {
      throw new Error('Not an OPML document (expected <opml> root).');
    }
  }

  const body = root.tag === 'body' ? root : findChild(root, 'body');
  if (!body) {
    throw new Error('OPML has no <body> element.');
  }

  const headTitle = (() => {
    if (root.tag === 'body') return '';
    const head = findChild(root, 'head');
    if (!head) return '';
    const title = findChild(head, 'title');
    return title?.text.trim() ?? '';
  })();

  const topOutlines = body.children.filter((c) => c.tag === 'outline');
  if (topOutlines.length === 0) {
    throw new Error('OPML has no <outline> elements to import.');
  }

  let mapRoot: ParsedNode;
  let suggestedTitle: string;

  if (topOutlines.length === 1 && !headTitle) {
    mapRoot = outlineToParsed(topOutlines[0]);
    suggestedTitle = mapRoot.label;
  } else {
    const title = headTitle || filenameToTitle(fileName);
    mapRoot = newParsed(title);
    mapRoot.children = topOutlines.map(outlineToParsed);
    suggestedTitle = title;
  }

  return { data: buildMindMapData(mapRoot), suggestedTitle };
}
