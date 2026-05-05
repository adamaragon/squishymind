import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // Public + unlisted maps are readable by anyone via the share token.
  const { data: mindmap } = await supabase
    .from('mindmaps')
    .select('id, title, visibility, data')
    .eq('share_token', token)
    .in('visibility', ['public', 'unlisted'])
    .single();
  if (!mindmap) notFound();

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <img src="/brain.svg" alt="" width={32} height={32} />
          <span className="text-lg font-semibold gradient-text">SquishyMind</span>
        </Link>
        <Link href="/signup" className="btn btn-primary text-sm">Sign up to make your own</Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-2">{mindmap.title}</h1>
        <p className="text-sm text-[--text-dim] mb-5">
          You're viewing a shared mind map (read-only).
        </p>
        <div className="glass rounded-2xl overflow-hidden" style={{ height: '70vh' }}>
          <iframe
            src={`/editor.html?readonly=1`}
            title={`SquishyMind — ${mindmap.title}`}
            className="w-full h-full block border-0"
          />
        </div>

        {/* Sticky sign-up nudge */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass rounded-full px-5 py-3 flex items-center gap-3 shadow-2xl">
          <span className="text-sm text-[--text-dim]">Like what you see?</span>
          <Link href="/signup" className="btn btn-primary text-sm py-2 px-4">Sign up free</Link>
        </div>
      </main>
    </>
  );
}
