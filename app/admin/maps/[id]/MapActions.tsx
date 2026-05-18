'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Props = {
  mapId: string;
  title: string;
  slug: string | null;
};

export default function MapActions({ mapId, title, slug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function deleteMap() {
    if (
      !window.confirm(
        `Permanently delete "${title}"? Removes the map, all its nodes, attachments, collaborators, and comments. Cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/admin/maps/${mapId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Failed (${res.status})`);
        return;
      }
      router.push('/admin/maps');
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="font-semibold mb-1">Actions</h2>
      <p className="text-xs text-[--text-dim] mb-4">
        Open the map in the live editor (read-only for non-owners) or
        force-delete it from the admin client.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/m/${slug || mapId}`}
          target="_blank"
          className="btn btn-ghost text-sm"
        >
          ↗ Open in editor
        </Link>
        <button
          type="button"
          onClick={deleteMap}
          disabled={pending}
          className="btn btn-danger text-sm ml-auto"
        >
          🗑 Delete map
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
