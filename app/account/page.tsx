import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase/server';
import DeleteAccountButton from './DeleteAccountButton';
import SignOutButton from './SignOutButton';

async function deleteAccount() {
  'use server';
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(`Account deletion failed: ${error}`);
  }

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
          <SignOutButton />
        </section>

        <section className="glass rounded-2xl p-6 border-red-500/20">
          <h2 className="text-lg font-medium mb-2 text-red-300">Delete account</h2>
          <p className="text-sm text-[--text-dim] mb-4">
            Permanently deletes your account, all your mind maps, and all
            collaborator invites. No email confirmation. No undo.
          </p>
          <DeleteAccountButton action={deleteAccount} />
        </section>

        <p className="text-center text-sm text-[--text-dim] mt-8">
          <Link href="/dashboard" className="underline">← Back to dashboard</Link>
        </p>
      </main>
    </>
  );
}
