import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditorShell from './EditorShell';

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

  return (
    <EditorShell
      id={mindmap.id}
      initialTitle={mindmap.title}
      initialSlug={mindmap.slug ?? ''}
      initialVisibility={mindmap.visibility}
      initialShareToken={mindmap.share_token}
      initialData={mindmap.data}
    />
  );
}
