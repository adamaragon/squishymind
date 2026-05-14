import type { MindMapData } from '../types';
import { parseMarkdown } from './markdown';
import { parseCsv } from './csv';
import { parseOpml } from './opml';
import { parseSquishyMindJson } from './json';

export type ImportFormat = 'markdown' | 'csv' | 'opml' | 'json';
export type ImportResult = { data: MindMapData; suggestedTitle: string };

export function detectFormat(fileName: string, contents: string): ImportFormat {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') return 'markdown';
  if (ext === 'csv') return 'csv';
  if (ext === 'opml' || ext === 'xml') return 'opml';
  if (ext === 'json') return 'json';

  const trimmed = contents.trimStart();
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<opml')) return 'opml';
  if (trimmed.startsWith('{')) return 'json';
  const firstLine = (contents.split('\n')[0] || '').trim();
  if (firstLine && /^[^,\n]+,[^,\n]+/.test(firstLine)) return 'csv';
  return 'markdown';
}

/**
 * Parse any supported import format and return MindMapData + a suggested title.
 * For v3.1 step 1, only markdown is wired; the other formats land in
 * follow-up commits. Calling with an unsupported format throws so the
 * server route surfaces a clean error rather than silently producing junk.
 */
export async function parseImport(
  fileName: string,
  contents: string,
  formatHint?: ImportFormat,
): Promise<ImportResult> {
  const format = formatHint ?? detectFormat(fileName, contents);
  switch (format) {
    case 'markdown':
      return parseMarkdown(contents, fileName);
    case 'csv':
      return parseCsv(contents, fileName);
    case 'opml':
      return parseOpml(contents, fileName);
    case 'json':
      return parseSquishyMindJson(contents, fileName);
  }
}
