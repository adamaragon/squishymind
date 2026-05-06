export type ExpansionContext = {
  nodeLabel: string;
  nodeNote?: string;
  parentLabel?: string;
  siblingLabels?: string[];
};

export function expansionSystemPrompt() {
  return `You help users expand mind map nodes. Given a node label and context, suggest 5–8 child concepts that naturally branch from it. Return ONLY valid JSON in this exact shape:
{
  "children": [
    { "label": "Short label (≤6 words)", "note": "One-sentence elaboration." }
  ]
}
Keep labels punchy — they appear in small bubbles on a canvas. The note is a brief tooltip; one sentence max. No markdown, no emoji, no quotation marks inside the strings.`;
}

export function expansionUserPrompt(args: ExpansionContext) {
  const lines = [
    `Node label: ${args.nodeLabel}`,
    args.nodeNote ? `Node note: ${args.nodeNote}` : null,
    args.parentLabel ? `Parent node: ${args.parentLabel}` : null,
    args.siblingLabels?.length
      ? `Sibling nodes (avoid duplicating these): ${args.siblingLabels.join(', ')}`
      : null,
    '',
    'Generate 5–8 distinct child concepts that branch from this node.',
  ].filter(Boolean);
  return lines.join('\n');
}
