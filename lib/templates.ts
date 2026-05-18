import type { MindMapData, MindMapNode } from './types';

export type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  data: MindMapData;
};

/** A branch in template data. Plain strings shorthand a label-only leaf;
 *  the object form supports a `note` and recursive `children`. Depth is
 *  bounded only by sanity — current templates use up to depth 3. */
export type TemplateBranch =
  | string
  | { label: string; note?: string; children?: TemplateBranch[] };

/**
 * Build a MindMapData from a recursive branch description.
 *
 * Depth 1 branches distribute evenly around a full circle from the root.
 * Deeper levels spread on a narrowing arc opening outward from their
 * parent — radii shrink at each depth so a 50-node template still fits
 * inside a couple of screens without overlap.
 */
function makeTemplate(rootLabel: string, branches: TemplateBranch[]): MindMapData {
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

  // Radii decrease with depth so deeper nodes don't run off the screen.
  // The defaults match the imperative canvas's own placeChild layout.
  function radiusFor(depth: number): number {
    if (depth === 1) return 240;
    if (depth === 2) return 190;
    if (depth === 3) return 150;
    return 120;
  }

  function placeChildren(
    parent: MindMapNode,
    outwardAngle: number,
    parentColorIdx: number,
    children: TemplateBranch[],
    depth: number,
  ) {
    if (children.length === 0) return;
    const radius = radiusFor(depth);
    const n = children.length;

    // At depth 1 children spread around the full circle from the root.
    // At deeper levels they fan out on an arc centred on the parent's
    // own outward angle — tighter as siblings increase but capped so a
    // wide group doesn't curl back on itself.
    const arcSpan =
      depth === 1
        ? Math.PI * 2
        : Math.min(Math.PI * 0.9, Math.max(0.6, n * 0.42));

    children.forEach((raw, i) => {
      const obj = typeof raw === 'string' ? { label: raw } : raw;
      let angle: number;
      if (depth === 1) {
        angle = (i / n) * Math.PI * 2;
      } else if (n === 1) {
        angle = outwardAngle;
      } else {
        const step = arcSpan / (n - 1);
        angle = outwardAngle + (i - (n - 1) / 2) * step;
      }

      const id = nextId();
      const colorIdx = (parentColorIdx + i + 1) % 5;
      nodes[id] = {
        id,
        label: obj.label,
        x: parent.x + Math.cos(angle) * radius,
        y: parent.y + Math.sin(angle) * radius,
        parentId: parent.id,
        depth,
        colorIdx,
        note: obj.note || '',
        createdAt: now,
      };
      (childIndex[parent.id] = childIndex[parent.id] || []).push(id);

      if (obj.children && obj.children.length > 0) {
        // Pass `angle` (the direction from parent to THIS node) as the
        // outward direction for this node's own children.
        placeChildren(nodes[id], angle, colorIdx, obj.children, depth + 1);
      }
    });
  }

  placeChildren(nodes[rootId], 0, 0, branches, 1);
  return { nodes, childIndex, rootId };
}

export const templates: Template[] = [
  {
    id: 'project-planning',
    name: 'Project Planning',
    description:
      'A complete five-phase project blueprint — define, design, build, launch, measure — with concrete sub-items at each stage so you can see the shape before you fill in your own.',
    icon: '🎯',
    data: makeTemplate('My Project', [
      {
        label: 'Define',
        children: [
          {
            label: 'Goals',
            children: ['Primary outcome', 'Success metric', 'Out of scope'],
          },
          {
            label: 'Scope',
            children: ['MVP cut', 'In-scope features', 'Stretch goals'],
          },
          {
            label: 'Stakeholders',
            children: ['Sponsor', 'Working team', 'Reviewers'],
          },
        ],
      },
      {
        label: 'Design',
        children: [
          {
            label: 'Approach',
            children: ['Tech choices', 'Architecture', 'Trade-offs'],
          },
          {
            label: 'Constraints',
            children: ['Time', 'Budget', 'Team capacity'],
          },
          { label: 'Open questions', children: ['Question 1', 'Question 2'] },
        ],
      },
      {
        label: 'Build',
        children: [
          {
            label: 'Tasks',
            children: ['Backlog', 'In progress', 'Done'],
          },
          {
            label: 'Milestones',
            children: ['Alpha', 'Beta', 'GA'],
          },
          {
            label: 'Dependencies',
            children: ['Internal', 'External', 'Third-party'],
          },
        ],
      },
      {
        label: 'Launch',
        children: [
          {
            label: 'Plan',
            children: ['Soft launch', 'Hard launch', 'Comms timeline'],
          },
          {
            label: 'Risks',
            children: ['Technical', 'Market', 'Team'],
          },
          {
            label: 'Communication',
            children: ['Customers', 'Internal team', 'Stakeholders'],
          },
        ],
      },
      {
        label: 'Measure',
        children: [
          { label: 'What worked', children: ['Wins to repeat'] },
          { label: 'What didn’t', children: ['Lessons learned'] },
          {
            label: 'Next steps',
            children: ['Quick wins', 'Long-term improvements'],
          },
        ],
      },
    ]),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description:
      'A central question with seven angle-prompts around it, each pre-seeded with starter ideas so the page never feels blank when inspiration is slow.',
    icon: '💡',
    data: makeTemplate('How might we…', [
      {
        label: 'What if we did the opposite?',
        children: ['Idea 1', 'Idea 2', 'Wildly bad idea (often useful)'],
      },
      {
        label: 'Who’s already solved this?',
        children: ['Adjacent industries', 'Direct competitors', 'Historical precedent'],
      },
      {
        label: 'What does the user actually want?',
        children: ['Stated needs', 'Unstated needs', 'Jobs to be done'],
      },
      {
        label: 'What would success look like?',
        children: ['In 1 month', 'In 6 months', 'In a year'],
      },
      {
        label: 'What if we had unlimited resources?',
        children: ['The dream version', 'Then trim back to feasible'],
      },
      {
        label: 'What if we had to ship tomorrow?',
        children: ['Bare-minimum version', 'What we’d cut first'],
      },
      {
        label: 'What’s the worst possible idea?',
        children: ['(It often points at the best one)'],
      },
    ]),
  },
  {
    id: 'reading-list',
    name: 'Reading List',
    description:
      'A living reading log split by status and category — currently reading, queued, finished, fiction, non-fiction, and recommendations — with sample titles to show how it fills in.',
    icon: '📚',
    data: makeTemplate('My Reading', [
      {
        label: 'Currently reading',
        children: ['Book 1', 'Book 2'],
      },
      {
        label: 'Next up',
        children: [
          'Recommended by a friend',
          'Spotted in a bookshop',
          'Saw it cited somewhere',
        ],
      },
      {
        label: 'Just finished',
        children: ['★★★★★ — would re-read', '★★★ — worth a skim'],
      },
      {
        label: 'Want to revisit',
        children: ['Read too young', 'Read too fast', 'Read in pieces'],
      },
      {
        label: 'Fiction',
        children: ['Classics', 'Contemporary', 'Sci-fi / speculative'],
      },
      {
        label: 'Non-fiction',
        children: ['Biographies', 'Science', 'Business / craft', 'Essays'],
      },
      {
        label: 'Recommendations',
        children: ['From a friend', 'From a podcast', 'From someone smart on the internet'],
      },
    ]),
  },
  {
    id: 'decision-tree',
    name: 'Decision Tree',
    description:
      'A decision in the middle with explicit criteria, three real options each fleshed out with pros / cons / cost, plus a "do nothing" branch for the option people forget to consider.',
    icon: '⚖️',
    data: makeTemplate('My Decision', [
      {
        label: 'Criteria · what matters',
        children: [
          'Cost',
          'Time to result',
          'Risk',
          'Learning value',
          'Reversibility',
        ],
      },
      {
        label: 'Option A',
        children: [
          { label: 'Pros', children: ['Fast to start', 'Low risk', 'Familiar territory'] },
          { label: 'Cons', children: ['Limited upside', 'Easy to copy'] },
          { label: 'Cost', children: ['Time', 'Money', 'Opportunity cost'] },
        ],
      },
      {
        label: 'Option B',
        children: [
          { label: 'Pros', children: ['Big upside', 'High learning'] },
          { label: 'Cons', children: ['Slow to start', 'Hard to reverse'] },
          { label: 'Cost', children: ['Time', 'Money', 'Opportunity cost'] },
        ],
      },
      {
        label: 'Option C',
        children: [
          { label: 'Pros', children: ['Unexpected combination', 'Differentiated'] },
          { label: 'Cons', children: ['Untested', 'Harder to explain'] },
          { label: 'Cost', children: ['Time', 'Money'] },
        ],
      },
      {
        label: 'Do nothing',
        children: [
          { label: 'What stays the same' },
          {
            label: 'What gets worse',
            children: ['In 3 months', 'In a year'],
          },
        ],
      },
    ]),
  },
  {
    id: 'second-brain',
    name: 'Second Brain',
    description:
      'A personal knowledge map across six life domains — work, learning, health, relationships, ideas, finance — with two layers of structure inside each so you can drop notes straight in.',
    icon: '🧠',
    data: makeTemplate('My Knowledge', [
      {
        label: 'Work',
        children: [
          { label: 'Projects', children: ['Active', 'Backlog', 'Done this quarter'] },
          { label: 'People', children: ['Team', 'Network', '1:1 notes'] },
          { label: 'Learnings', children: ['This quarter', 'This year'] },
        ],
      },
      {
        label: 'Learning',
        children: [
          { label: 'Topics', children: ['Reading now', 'Curious about', 'Want to ignore'] },
          { label: 'Resources', children: ['Books', 'Courses', 'People to follow'] },
          { label: 'Open questions', children: ['Big ones', 'Small ones'] },
        ],
      },
      {
        label: 'Health',
        children: [
          { label: 'Routines', children: ['Daily', 'Weekly', 'Seasonal'] },
          { label: 'Goals', children: ['Short term', 'Long term'] },
          { label: 'Notes', children: ['Sleep', 'Movement', 'Food'] },
        ],
      },
      {
        label: 'Relationships',
        children: [
          { label: 'Family', children: ['Immediate', 'Extended'] },
          { label: 'Friends', children: ['Close', 'Wider circle'] },
          { label: 'Network', children: ['Mentors', 'Peers', 'People to thank'] },
        ],
      },
      {
        label: 'Ideas',
        children: [
          {
            label: 'Side projects',
            children: ['In progress', 'Maybe someday', 'Sunset / archived'],
          },
          {
            label: 'Random thoughts',
            children: ['Worth revisiting', 'Just dumping'],
          },
        ],
      },
      {
        label: 'Finance',
        children: [
          { label: 'Budget', children: ['Fixed', 'Variable'] },
          { label: 'Savings', children: ['Goals', 'Buckets'] },
          { label: 'Investments', children: ['Strategy', 'Holdings'] },
        ],
      },
    ]),
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description:
      'A meeting-shaped template with attendees, timed agenda, discussion, decisions, actions (with owner + due date), parking lot, and follow-up — ready to fill in live.',
    icon: '📝',
    data: makeTemplate('Meeting · [date]', [
      {
        label: 'Attendees',
        children: ['Present', 'Apologies', 'Notes-taker'],
      },
      {
        label: 'Agenda',
        children: [
          'Item 1 · 5 min',
          'Item 2 · 10 min',
          'Item 3 · 10 min',
          'AOB',
        ],
      },
      {
        label: 'Discussion',
        children: ['Key points', 'Open questions', 'Concerns raised'],
      },
      {
        label: 'Decisions',
        children: ['Agreed', 'Deferred', 'Rejected (and why)'],
      },
      {
        label: 'Actions',
        children: [
          'Owner · action · due [date]',
          'Owner · action · due [date]',
          'Follow up on [topic]',
        ],
      },
      {
        label: 'Parking lot',
        children: ['For next meeting', 'For another forum'],
      },
      {
        label: 'Next meeting',
        children: ['Date', 'Topics to cover', 'Pre-reads'],
      },
    ]),
  },
  {
    id: 'okrs',
    name: 'Goals & OKRs',
    description:
      'An objective with four key results, each fully decomposed into target / current / owner / actions / status, plus quarterly check-ins and a risks branch.',
    icon: '🥅',
    data: makeTemplate('My Objective', [
      {
        label: 'Key result 1',
        children: [
          'Target · number or state',
          'Current · number or state',
          'Owner',
          { label: 'Actions', children: ['This week', 'Next week'] },
          'Status · green / yellow / red',
        ],
      },
      {
        label: 'Key result 2',
        children: [
          'Target',
          'Current',
          'Owner',
          { label: 'Actions', children: ['This week', 'Next week'] },
          'Status',
        ],
      },
      {
        label: 'Key result 3',
        children: [
          'Target',
          'Current',
          'Owner',
          { label: 'Actions', children: ['This week', 'Next week'] },
          'Status',
        ],
      },
      {
        label: 'Key result 4 (optional stretch)',
        children: ['Target', 'Why this one', 'Owner', 'Status'],
      },
      {
        label: 'Check-ins',
        children: ['Week 4 review', 'Week 8 review', 'Week 12 (close-out)'],
      },
      {
        label: 'Risks & blockers',
        children: ['Known', 'Watching for', 'Mitigation'],
      },
    ]),
  },
  {
    id: 'trip',
    name: 'Trip Planning',
    description:
      'A trip-planning workspace with logistics, documents, activities, food, packing, budget, and notes — three layers deep so you can drop reservations and dish names straight in.',
    icon: '✈️',
    data: makeTemplate('My Trip', [
      {
        label: 'Logistics',
        children: [
          {
            label: 'Flights',
            children: ['Outbound · date · ref', 'Return · date · ref'],
          },
          {
            label: 'Hotels',
            children: ['Nights 1–3', 'Nights 4–7'],
          },
          {
            label: 'Transport',
            children: ['Airport ↔ hotel', 'Within city', 'Day trips'],
          },
        ],
      },
      {
        label: 'Documents',
        children: [
          'Passport · expiry',
          'Visa · if needed',
          'Travel insurance',
          'Vaccinations',
          'Local currency / card check',
        ],
      },
      {
        label: 'Activities',
        children: [
          {
            label: 'Must-do',
            children: ['Activity 1 · booked?', 'Activity 2', 'Activity 3'],
          },
          {
            label: 'If time',
            children: ['Off-the-tourist-trail option', 'Free afternoon ideas'],
          },
          {
            label: 'Backup',
            children: ['Rainy day plan', 'Tired day plan'],
          },
        ],
      },
      {
        label: 'Food',
        children: [
          { label: 'Must-try dishes', children: ['Local breakfast', 'Famous dish'] },
          {
            label: 'Restaurants',
            children: ['Lunch picks', 'Dinner picks', 'Special-occasion spot'],
          },
          { label: 'Coffee / snacks', children: ['Mornings', 'Afternoons'] },
        ],
      },
      {
        label: 'Pack',
        children: [
          {
            label: 'Essentials',
            children: ['Adapters', 'Meds', 'Tech (chargers, cables)'],
          },
          {
            label: 'Clothes',
            children: ['Day', 'Evening', 'Weather-appropriate layer'],
          },
          'Optional · nice-to-haves',
        ],
      },
      {
        label: 'Budget',
        children: [
          'Total budget',
          'Flights · planned',
          'Hotels · planned',
          'Food · daily limit',
          'Activities · planned',
          'Buffer for souvenirs',
        ],
      },
      {
        label: 'Notes',
        children: [
          'Language / phrases',
          'Tipping customs',
          'Time-zone shift',
          'Random reminders',
        ],
      },
    ]),
  },
];
