import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MindMapCanvas from '@/components/MindMapCanvas';
import Footer from '@/components/Footer';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // The share route accepts two URL forms:
  //  - 32-char hex share_token: unguessable, works for any visibility
  //    (private/unlisted/public). The token IS the access gate.
  //  - vanity slug: pretty but guessable, only unlocks unlisted/public.
  //    Slug URLs never expose private maps.
  const isHexToken = /^[0-9a-f]{32}$/i.test(token);
  const select = supabase
    .from('mindmaps')
    .select('id, title, visibility, data');
  const { data: mindmap } = await (isHexToken
    ? select.eq('share_token', token)
    : select.eq('slug', token).in('visibility', ['public', 'unlisted'])
  ).single();
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
