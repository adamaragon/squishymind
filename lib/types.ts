/** A generic file attached to a node. Distinct from `imageUrl`, which the
 *  canvas owns as a single primary image. Attachments can be any allowed
 *  type (PDF, zip, doc, etc.) and live in the same storage bucket. */
export type Attachment = {
  url: string;
  name: string;
  type: string; // MIME type
  size?: number;
};

/** Direction of flow along an edge. `forward` = arrow at the destination
 *  end (parent → child by default), `backward` = arrow at the origin,
 *  `both` = arrowheads at both ends, `none` = a plain line. Missing →
 *  treated as `forward` so legacy maps keep their original look. */
export type FlowDirection = 'forward' | 'backward' | 'both' | 'none';

/** A non-structural connection between two nodes. Distinct from the
 *  parent-child tree edges encoded in `childIndex`. Rendered as a dashed
 *  line on the canvas; arrowheads follow `flowDirection`. */
export type NodeLink = {
  /** Target node id in the same MindMapData. Orphan links (target no
   *  longer exists) are silently skipped at render time. */
  targetId: string;
  /** Direction of flow on the link. Defaults to `forward` (this node → target). */
  flowDirection?: FlowDirection;
};

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
  attachments?: Attachment[];
  /** Direction of flow on the parent→this edge. Missing == 'forward'. */
  flowDirection?: FlowDirection;
  /** Non-structural connections from this node to others in the map. */
  links?: NodeLink[];
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
  /** Optional URL-friendly slug; null until the user picks one (or never).
   *  Unique when non-null. Added in migration 0006_slug.sql. */
  slug: string | null;
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
