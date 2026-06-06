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

// ---- Whole-map "Smarter Squishy" assist ----

export type AssistAction = 'summarize' | 'gaps' | 'plan';

export function assistSystemPrompt(action: AssistAction) {
  if (action === 'summarize') {
    return `You are Squishy, a sharp, warm mind-mapping assistant. Given a mind map's outline, write a crisp executive summary a busy person could read in 20 seconds. Lead with the core idea, then the 2–4 most important themes. Plain prose, no markdown headers. Return ONLY valid JSON: { "summary": "..." } — 3–5 short sentences, no preamble.`;
  }
  if (action === 'gaps') {
    return `You are Squishy, a sharp mind-mapping assistant doing gap analysis. Given a mind map's outline, identify what's MISSING — important angles, risks, steps, or considerations the map overlooks. Return ONLY valid JSON in this shape:
{ "children": [ { "label": "Short label (≤6 words)", "note": "Why this gap matters, one sentence." } ] }
Return 4–7 genuinely missing items (not restatements of what's already there). Punchy labels, no markdown, no emoji, no quotes inside strings.`;
  }
  // plan
  return `You are Squishy, a sharp mind-mapping assistant. Given a mind map's outline (a goal or topic), produce a concrete, ordered action plan to move it forward. Return ONLY valid JSON in this shape:
{ "children": [ { "label": "Action step (≤7 words)", "note": "One-sentence detail of the step." } ] }
Return 5–8 sequential, actionable steps. Punchy imperative labels, no markdown, no emoji, no quotes inside strings.`;
}

export function assistUserPrompt(action: AssistAction, outline: string, focusLabel?: string) {
  const head =
    action === 'summarize'
      ? 'Summarise this mind map:'
      : action === 'gaps'
        ? 'Find what is missing from this mind map:'
        : `Produce an action plan${focusLabel ? ` for "${focusLabel}"` : ''} based on this mind map:`;
  return `${head}\n\n${outline}`;
}
