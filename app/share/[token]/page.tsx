import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MindMapCanvas from '@/components/MindMapCanvas';
import Footer from '@/components/Footer';

type ShareMindmap = {
  id: string;
  title: string;
  visibility: string;
  data: import('@/lib/types').MindMapData;
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // The share route accepts two URL forms:
  //  - 32-char hex share_token: unguessable, works for any visibility
  //    (private/unlisted/public). The token IS the access gate. Resolved
  //    via the get_mindmap_by_share_token RPC (security definer) because
  //    the regular RLS policy on mindmaps blocks SELECTs on private rows
  //    even with a matching token — see migration 0008.
  //  - vanity slug: pretty but guessable, only unlocks unlisted/public.
  //    Slug URLs never expose private maps; RLS handles that gate directly.
  const isHexToken = /^[0-9a-f]{32}$/i.test(token);

  let mindmap: ShareMindmap | null = null;
  if (isHexToken) {
    const { data } = await supabase.rpc('get_mindmap_by_share_token', {
      token,
    });
    // The RPC returns a setof; PostgREST yields an array even though we
    // limit 1. Pull the first row, or null.
    const row = Array.isArray(data) ? data[0] : null;
    if (row) {
      mindmap = {
        id: row.id,
        title: row.title,
        visibility: row.visibility,
        data: row.data,
      };
    }
  } else {
    const { data } = await supabase
      .from('mindmaps')
      .select('id, title, visibility, data')
      .eq('slug', token)
      .in('visibility', ['public', 'unlisted'])
      .single();
    if (data) mindmap = data as ShareMindmap;
  }
  if (!mindmap) notFound();

  return (
    <>
      <div className="flex flex-col" style={{ height: '100dvh' }}>
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <img src="/brain.svg" alt="" width={28} height={28} />
            <span className="text-base font-semibold gradient-text">SquishyMind</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[--text-dim] hidden sm:inline">{mindmap.title}</span>
            <Link href="/signup" className="btn btn-primary text-sm">
              Sign up to make your own
            </Link>
          </div>
        </header>

        <div className="flex-1 min-h-0 relative">
          <MindMapCanvas
            key={mindmap.id}
            mindmapId={mindmap.id}
            initialData={mindmap.data}
            initialTitle={mindmap.title}
            readonly
          />
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl z-50">
          <span className="text-sm text-[--text-dim]">Like what you see?</span>
          <Link href="/signup" className="btn btn-primary text-sm py-2 px-4">
            Sign up free
          </Link>
        </div>
      </div>
      <Footer minimal />
    </>
  );
}
