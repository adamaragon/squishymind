import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditorShell from './EditorShell';
import Footer from '@/components/Footer';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Fetch the mindmap. Wrapped in try/catch so a Supabase failure surfaces
  // as a clean 404 rather than the generic Vercel "page couldn't load".
  let mindmap;
  try {
    const query = supabase
      .from('mindmaps')
      .select('id, title, visibility, share_token, owner_id, slug, data');
    const result = await (isUuid ? query.eq('id', id) : query.eq('slug', id)).single();
    mindmap = result.data;
  } catch (err) {
    console.error('[m/[id]] mindmap fetch failed', err);
    notFound();
  }
  if (!mindmap) notFound();

  // Canonical URL: when a slug is set, the address bar should use it.
  if (mindmap.slug && id !== mindmap.slug) {
    redirect(`/m/${mindmap.slug}`);
  }

  const displayName = user.email?.split('@')[0] || 'someone';

  // Determine the viewer's role. Owner check is local (no query). Collaborator
  // lookup is wrapped in try/catch and falls back to 'commenter' so an RLS
  // hiccup, transient DB error, or unexpected shape doesn't crash the page.
  const isOwner = mindmap.owner_id === user.id;
  let role: 'owner' | 'editor' | 'commenter' = 'commenter';
  if (isOwner) {
    role = 'owner';
  } else {
    try {
      const { data: collab } = await supabase
        .from('collaborators')
        .select('role')
        .eq('mindmap_id', mindmap.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (collab?.role === 'editor') role = 'editor';
      else if (collab?.role === 'commenter') role = 'commenter';
    } catch (err) {
      console.error('[m/[id]] collaborators lookup failed', err);
      // Fall through with role='commenter' — least-privilege default.
    }
  }
  const canEdit = role === 'owner' || role === 'editor';

  // Defensive: if the data column is somehow null or wrong shape, give the
  // canvas an empty seed instead of letting the client-side JSON access bomb.
  const safeData =
    mindmap.data &&
    typeof mindmap.data === 'object' &&
    'nodes' in mindmap.data
      ? mindmap.data
      : { nodes: {}, childIndex: {}, rootId: null };

  return (
    <>
      <EditorShell
        id={mindmap.id}
        initialTitle={mindmap.title}
        initialSlug={mindmap.slug ?? ''}
        initialVisibility={mindmap.visibility}
        initialShareToken={mindmap.share_token}
        initialData={safeData}
        currentUserId={user.id}
        currentUserName={displayName}
        ownerId={mindmap.owner_id}
        canEdit={canEdit}
        role={role}
      />
      <Footer minimal />
    </>
  );
}
