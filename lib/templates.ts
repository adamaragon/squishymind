import type { MindMapData, MindMapNode } from './types';

export type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  data: MindMapData;
};

/**
 * Build a MindMapData from a simple branch description.
 * Children are placed on the parent's outward arc; root branches form a circle.
 */
function makeTemplate(
  rootLabel: string,
  branches: Array<{ label: string; children?: string[] }>,
): MindMapData {
  const nodes: Record<string, MindMapNode> = {};
  const childIndex: Record<string, string[]> = {};
  let counter = 1;
  const nextId = () => `n${counter++}`;
  const now = Date.now();

  const rootId = nextId();
  nodes[rootId] = {
    id: rootId,
    label: rootLabel,
    x: 0,
    y: 0,
    parentId: null,
    depth: 0,
    colorIdx: 0,
    note: '',
    createdAt: now,
  };

  branches.forEach((branch, bi) => {
    const branchId = nextId();
    const branchAngle = (bi / branches.length) * Math.PI * 2;
    const branchRadius = 220;
    nodes[branchId] = {
      id: branchId,
      label: branch.label,
      x: Math.cos(branchAngle) * branchRadius,
      y: Math.sin(branchAngle) * branchRadius,
      parentId: rootId,
      depth: 1,
      colorIdx: bi % 5,
      note: '',
      createdAt: now,
    };
    (childIndex[rootId] = childIndex[rootId] || []).push(branchId);

    const kids = branch.children || [];
    if (kids.length === 0) return;
    const childRadius = 180;
    kids.forEach((label, ci) => {
      const childId = nextId();
      const offset = (ci - (kids.length - 1) / 2) * 0.4;
      const childAngle = branchAngle + offset;
      nodes[childId] = {
        id: childId,
        label,
        x: nodes[branchId].x + Math.cos(childAngle) * childRadius,
        y: nodes[branchId].y + Math.sin(childAngle) * childRadius,
        parentId: branchId,
        depth: 2,
        colorIdx: (bi + ci + 1) % 5,
        note: '',
        createdAt: now,
      };
      (childIndex[branchId] = childIndex[branchId] || []).push(childId);
    });
  });

  return { nodes, childIndex, rootId };
}

export const templates: Template[] = [
  {
    id: 'project-planning',
    name: 'Project Planning',
    description:
      'Plan a project with phases, deliverables, and blockers. Five-branch structure to start.',
    icon: '🎯',
    data: makeTemplate('My Project', [
      { label: 'Define', children: ['Goals', 'Scope', 'Success metrics'] },
      { label: 'Design', children: ['Approach', 'Constraints', 'Open questions'] },
      { label: 'Build', children: ['Tasks', 'Milestones', 'Dependencies'] },
      { label: 'Launch', children: ['Plan', 'Risks', 'Communication'] },
      { label: 'Measure', children: ['What worked', 'What didn’t', 'Next steps'] },
    ]),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'A question in the middle, angles around it. Five branches to fill in.',
    icon: '💡',
    data: makeTemplate('My Question', [
      { label: 'What if…' },
      { label: 'Why does…' },
      { label: 'Who else…' },
      { label: 'What about…' },
      { label: 'How might we…' },
    ]),
  },
  {
    id: 'reading-list',
    name: 'Reading List',
    description: 'Books and articles grouped by topic. Lives forever, grows organically.',
    icon: '📚',
    data: makeTemplate('My Reading', [
      { label: 'Currently reading' },
      { label: 'Next up' },
      { label: 'Just finished' },
      { label: 'Want to revisit' },
      { label: 'Recommendations' },
    ]),
  },
  {
    id: 'decision-tree',
    name: 'Decision Tree',
    description: 'A decision in the middle, options branching out with pros and cons under each.',
    icon: '⚖️',
    data: makeTemplate('My Decision', [
      { label: 'Option A', children: ['Pros', 'Cons', 'Cost'] },
      { label: 'Option B', children: ['Pros', 'Cons', 'Cost'] },
      { label: 'Option C', children: ['Pros', 'Cons', 'Cost'] },
      { label: 'Do nothing', children: ['What stays the same', 'What gets worse'] },
    ]),
  },
  {
    id: 'second-brain',
    name: 'Second Brain',
    description:
      'Personal knowledge map for everything you want to remember. Domains around the centre.',
    icon: '🧠',
    data: makeTemplate('My Knowledge', [
      { label: 'Work', children: ['Projects', 'People', 'Learnings'] },
      { label: 'Learning', children: ['Topics', 'Resources', 'Questions'] },
      { label: 'Health', children: ['Routines', 'Goals', 'Notes'] },
      { label: 'Relationships', children: ['Family', 'Friends', 'Network'] },
      { label: 'Ideas', children: ['Side projects', 'Random thoughts'] },
    ]),
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Capture a meeting with agenda items, decisions, and actions branching from each.',
    icon: '📝',
    data: makeTemplate('Meeting · [date]', [
      { label: 'Agenda', children: ['Item 1', 'Item 2', 'Item 3'] },
      { label: 'Discussion' },
      { label: 'Decisions' },
      { label: 'Actions', children: ['Owner · Action · Due date'] },
      { label: 'Parking lot' },
    ]),
  },
  {
    id: 'okrs',
    name: 'Goals & OKRs',
    description:
      'An objective at the centre, key results as branches. Quarterly goal-setting in a glance.',
    icon: '🥅',
    data: makeTemplate('My Objective', [
      { label: 'Key result 1', children: ['Action', 'Owner', 'Status'] },
      { label: 'Key result 2', children: ['Action', 'Owner', 'Status'] },
      { label: 'Key result 3', children: ['Action', 'Owner', 'Status'] },
    ]),
  },
  {
    id: 'trip',
    name: 'Trip Planning',
    description: 'A destination, then logistics, activities, food, and notes branching out.',
    icon: '✈️',
    data: makeTemplate('My Trip', [
      { label: 'Logistics', children: ['Flights', 'Hotels', 'Transport'] },
      { label: 'Activities', children: ['Must-do', 'If time', 'Backup'] },
      { label: 'Food', children: ['Must-try', 'Restaurants', 'Local specialities'] },
      { label: 'Pack', children: ['Essentials', 'Optional'] },
      { label: 'Notes' },
    ]),
  },
];
