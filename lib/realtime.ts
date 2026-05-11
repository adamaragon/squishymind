// Realtime helpers shared between MindMapCanvas (presence cursors, edit
// awareness) and SquishyWidget (collaborator_count dynamic variable).

export type PresenceState = {
  user_id: string;
  display_name: string;
  color: string;
  cursor_world_x?: number;
  cursor_world_y?: number;
  editing_node_id?: string | null;
};

// Curated colors so two collaborators rarely share a hue. Hashed stably
// from user_id so the same person gets the same color across sessions.
const PRESENCE_COLORS = [
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#3b82f6', // blue
];

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

export function presenceChannelName(mindmapId: string): string {
  return `map:${mindmapId}:presence`;
}
