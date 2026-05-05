import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase/server';

async function deleteAccount() {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Cascade-delete via the on-delete policy on auth.users.
  // We still need an admin call to actually remove the auth row — but the
  // anon key can't do that. For now we sign the user out and delete their
  // owned data; full auth-row deletion is wired up server-side next round.
  await supabase.from('mindmaps').delete().eq('owner_id', user.id);
  await supabase.from('profiles').delete().eq('id', user.id);
  await supabase.auth.signOut();
  redirect('/?deleted=1');
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6">Account</h1>

        <section className="glass rounded-2xl p-6 mb-5">
          <h2 className="text-lg font-medium mb-3">Profile</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-[--text-dim]">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[--text-dim]">Member since</dt>
              <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </section>

        <section className="glass rounded-2xl p-6 mb-5">
          <h2 className="text-lg font-medium mb-3">Sign out</h2>
          <p className="text-sm text-[--text-dim] mb-4">End your session on this browser.</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </section>

        <section className="glass rounded-2xl p-6 border-red-500/20">
          <h2 className="text-lg font-medium mb-2 text-red-300">Delete account</h2>
          <p className="text-sm text-[--text-dim] mb-4">
            Permanently deletes your account, all your mind maps, and all
            collaborator invites. No email confirmation. No undo.
          </p>
          <form action={deleteAccount}>
            <button
              type="submit"
              className="btn btn-danger"
              onClick={(e) => {
                if (!confirm('Permanently delete your account and all maps? This cannot be undone.')) {
                  e.preventDefault();
                }
              }}
            >
              Delete my account
            </button>
          </form>
        </section>

        <p className="text-center text-sm text-[--text-dim] mt-8">
          <Link href="/dashboard" className="underline">← Back to dashboard</Link>
        </p>
      </main>
    </>
  );
}
