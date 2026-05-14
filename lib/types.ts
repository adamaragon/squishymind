export type MindMapNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  parentId: string | null;
  depth: number;
  colorIdx: number;
  note: string;
  createdAt: number;
  imageUrl?: string | null;
};

export type MindMapData = {
  nodes: Record<string, MindMapNode>;
  childIndex: Record<string, string[]>;
  rootId: string | null;
};

export type Visibility = 'private' | 'unlisted' | 'public';

/** Which layout the editor renders for the current user. Persisted in
 *  localStorage per-user, NOT per-map. The underlying MindMapData stays
 *  unchanged across switches — each view just renders it differently. */
export type ViewMode = 'canvas' | 'tree' | 'outline' | 'table';

export type Mindmap = {
  id: string;
  owner_id: string;
  title: string;
  data: MindMapData;
  visibility: Visibility;
  share_token: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type CollaboratorRole = 'editor' | 'commenter';

export type Collaborator = {
  mindmap_id: string;
  user_id: string;
  role: CollaboratorRole;
  invited_at: string;
};
