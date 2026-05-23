import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';
import UserActions from './UserActions';

export const dynamic = 'force-dynamic';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: maps },
    { data: collabs },
    { count: commentsCount },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, display_name, created_at, is_founder, is_admin, avatar_url')
      .eq('id', id)
      .maybeSingle(),
    admin
      .from('mindmaps')
      .select('id, title, slug, visibility, created_at, updated_at')
      .eq('owner_id', id)
      .order('updated_at', { ascending: false })
      .limit(50),
    admin
      .from('collaborators')
      .select('mindmap_id, role, invited_at')
      .eq('user_id', id),
    admin
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id),
  ]);

  if (!profile) notFound();

  // Pull the auth.users row too — for last_sign_in_at and email_confirmed_at,
  // which live in the auth schema (not profiles).
  const { data: authUser } = await admin.auth.admin.getUserById(id);
  const authMeta = authUser?.user;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-xs text-[--text-dim] hover:text-white transition-colors"
        >
          ← All users
        </Link>
      </div>

      {/* Header card */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              {profile.display_name || profile.email || profile.id.slice(0, 8)}
            </h1>
            <div className="text-sm text-[--text-dim]">{profile.email}</div>
            <div className="text-[11px] text-[--text-dim] font-mono mt-1">
              {profile.id}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {profile.is_admin && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200">
                Admin
              </span>
            )}
            {profile.is_founder && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-200">
                Founder
              </span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <Stat label="Joined" value={fmtDate(profile.created_at)} />
          <Stat label="Last sign-in" value={fmtDate(authMeta?.last_sign_in_at)} />
          <Stat label="Email confirmed" value={authMeta?.email_confirmed_at ? '✓' : '—'} />
          <Stat label="Maps owned" value={String(maps?.length ?? 0)} />
          <Stat label="Collaborator on" value={String(collabs?.length ?? 0)} />
          <Stat label="Comments authored" value={String(commentsCount ?? 0)} />
          <Stat
            label="Auth provider"
            value={authMeta?.app_metadata?.provider || '—'}
          />
          <Stat label="Auth role" value={authMeta?.role || '—'} />
        </dl>
      </div>

      {/* Actions — client island */}
      <UserActions
        userId={profile.id}
        email={profile.email || ''}
        isFounder={profile.is_founder}
        isAdmin={profile.is_admin}
      />

      {/* Maps owned */}
      <section className="mt-8 glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Maps owned ({maps?.length ?? 0})</h2>
        </div>
        {maps && maps.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[--text-dim] border-b border-white/10">
                <th className="text-left py-2 px-5">Title</th>
                <th className="text-left py-2 px-3">Slug</th>
                <th className="text-left py-2 px-3">Visibility</th>
                <th className="text-right py-2 px-5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-white/5 hover:bg-white/[0.025]"
                >
                  <td className="py-2 px-5">
                    <Link
                      href={`/admin/maps/${m.id}`}
                      className="hover:underline"
                    >
                      {m.title || 'Untitled'}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-[--text-dim] font-mono text-[11px]">
                    {m.slug ? `/${m.slug}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-[--text-dim]">{m.visibility}</td>
                  <td className="py-2 px-5 text-right text-[11px] text-[--text-dim]">
                    {fmtDate(m.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-6 text-sm text-[--text-dim] italic">
            No maps owned.
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[--text-dim]">{label}</dt>
      <dd className="text-sm mt-0.5">{value}</dd>
    </div>
  );
}
