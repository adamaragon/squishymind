'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Props = {
  userId: string;
  email: string;
  isFounder: boolean;
  isAdmin: boolean;
};

export default function UserActions({ userId, email, isFounder, isAdmin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `Failed (${res.status})`);
      return false;
    }
    return true;
  }

  function toggleFounder() {
    startTransition(async () => {
      const ok = await patch({ is_founder: !isFounder });
      if (ok) router.refresh();
    });
  }

  function toggleAdmin() {
    startTransition(async () => {
      const ok = await patch({ is_admin: !isAdmin });
      if (ok) router.refresh();
    });
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        `Permanently delete ${email}? This removes their auth row, profile, maps, comments, and collaborator memberships. Cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Failed (${res.status})`);
        return;
      }
      router.push('/admin/users');
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="font-semibold mb-1">Actions</h2>
      <p className="text-xs text-[--text-dim] mb-4">
        Toggles flip immediately. Delete is irreversible.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleFounder}
          disabled={pending}
          className={`btn text-sm ${isFounder ? 'btn-ghost' : 'btn-primary'}`}
        >
          {isFounder ? '✕ Remove Founder' : '🪙 Grant Founder'}
        </button>
        <button
          type="button"
          onClick={toggleAdmin}
          disabled={pending}
          className={`btn text-sm ${isAdmin ? 'btn-ghost' : 'btn-ghost'}`}
          style={
            !isAdmin
              ? {
                  background: 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  color: '#fcd34d',
                }
              : undefined
          }
        >
          {isAdmin ? '✕ Revoke Admin' : '⚡ Grant Admin'}
        </button>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={pending}
          className="btn btn-danger text-sm ml-auto"
        >
          🗑 Delete account
        </button>
      </div>
      {error && (
        <div className="mt-3 text-xs text-red-300 px-3 py-2 rounded border border-red-500/30 bg-red-500/10">
          {error}
        </div>
      )}
      {pending && (
        <div className="mt-3 text-xs text-[--text-dim] italic">Working…</div>
      )}
    </div>
  );
}
