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
  const query = supabase
    .from('mindmaps')
    .select('id, title, visibility, share_token, owner_id, slug, data');
  const { data: mindmap } = await (isUuid ? query.eq('id', id) : query.eq('slug', id)).single();
  if (!mindmap) notFound();

  // Canonical URL: when a slug is set, the address bar should use it.
  if (mindmap.slug && id !== mindmap.slug) {
    redirect(`/m/${mindmap.slug}`);
  }

  const displayName = user.email?.split('@')[0] || 'someone';

  // Determine the viewer's role on this map. Owner trumps everything; otherwise
  // look up the collaborators row. RLS already restricts who can read the map
  // at all, so the only valid roles reaching this point are owner, editor, or
  // commenter — but we default to commenter (least privilege) if anything's
  // unexpected.
  const isOwner = mindmap.owner_id === user.id;
  let role: 'owner' | 'editor' | 'commenter' = 'commenter';
  if (isOwner) {
    role = 'owner';
  } else {
    const { data: collab } = await supabase
      .from('collaborators')
      .select('role')
      .eq('mindmap_id', mindmap.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (collab?.role === 'editor') role = 'editor';
    else if (collab?.role === 'commenter') role = 'commenter';
  }
  const canEdit = role === 'owner' || role === 'editor';

  return (
    <>
      <EditorShell
        id={mindmap.id}
        initialTitle={mindmap.title}
        initialSlug={mindmap.slug ?? ''}
        initialVisibility={mindmap.visibility}
        initialShareToken={mindmap.share_token}
        initialData={mindmap.data}
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
