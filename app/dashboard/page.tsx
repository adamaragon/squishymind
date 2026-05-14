import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DeleteMapButton from '@/components/DeleteMapButton';
import NewMapButton from '@/components/NewMapButton';
import ImportButton from '@/components/ImportButton';
import { createClient } from '@/lib/supabase/server';
import type { Mindmap } from '@/lib/types';

async function deleteMindmap(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const supabase = await createClient();
  await supabase.from('mindmaps').delete().eq('id', id);
  revalidatePath('/dashboard');
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: maps } = await supabase
    .from('mindmaps')
    .select('id, title, visibility, share_token, updated_at, created_at')
    .order('updated_at', { ascending: false });

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-3xl font-semibold">Your mind maps</h1>
          <div className="flex items-center gap-2">
            <ImportButton />
            <NewMapButton />
          </div>
        </div>

        {(!maps || maps.length === 0) ? (
          <div className="glass rounded-2xl p-10 text-center">
            <img src="/brain.svg" alt="" width={80} height={80} className="mx-auto mb-4 opacity-80" />
            <p className="text-lg mb-2">No maps yet — your brain is empty.</p>
            <p className="text-sm text-[--text-dim] mb-5">(In a healthy way. Let&apos;s fix that.)</p>
            <NewMapButton label="Create your first mind map" />
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4">
            {(maps as Mindmap[]).map((m) => (
              <li key={m.id} className="glass rounded-2xl p-5 flex flex-col gap-3">
                <Link href={`/m/${m.id}`} className="block">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-medium truncate">{m.title}</h3>
                    <span className="text-xs uppercase tracking-wider text-[--text-dim]">
                      {m.visibility}
                    </span>
                  </div>
                  <p className="text-xs text-[--text-dim] mt-1">
                    Updated {new Date(m.updated_at).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Link href={`/m/${m.id}`} className="btn btn-ghost text-xs">Open</Link>
                  {m.visibility !== 'private' && (
                    <Link href={`/share/${m.share_token}`} className="btn btn-ghost text-xs">
                      Share link
                    </Link>
                  )}
                  <DeleteMapButton id={m.id} action={deleteMindmap} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
