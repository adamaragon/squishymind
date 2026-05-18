'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Props = {
  id: string;
  body: string;
  createdAt: string;
  nodeId: string;
  mapId: string;
  mapTitle: string;
  mapSlug: string | null;
  authorId: string;
  authorLabel: string;
};

function timeAgo(date: string | null | undefined): string {
  if (!date) return '—';
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function CommentRow({
  id,
  body,
  createdAt,
  nodeId,
  mapId,
  mapTitle,
  mapSlug,
  authorId,
  authorLabel,
}: Props) {
  const router = useRouter();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function destroy() {
    if (!window.confirm(`Delete this comment by ${authorLabel}? Cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Failed (${res.status})`);
        return;
      }
      setRemoved(true);
      router.refresh();
    });
  }

  if (removed) {
    return (
      <div className="px-5 py-3 text-xs text-[--text-dim] italic">
        Comment removed.
      </div>
    );
  }

  return (
    <div className="px-5 py-4 flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[--text-dim] mb-1 flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/users/${authorId}`}
            className="text-white hover:underline"
          >
            {authorLabel}
          </Link>
          <span>·</span>
          <Link href={`/admin/maps/${mapId}`} className="hover:underline">
            {mapTitle}
          </Link>
          {mapSlug && (
            <Link
              href={`/m/${mapSlug}`}
              target="_blank"
              className="font-mono text-[10px] hover:text-white"
            >
              ↗
            </Link>
          )}
          <span>·</span>
          <span className="font-mono">node {nodeId.slice(0, 8)}</span>
          <span>·</span>
          <span>{timeAgo(createdAt)}</span>
        </div>
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {body}
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-300 px-2 py-1 rounded border border-red-500/30 bg-red-500/10">
            {error}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <button
          type="button"
          onClick={destroy}
          disabled={pending}
          className="btn btn-danger text-xs px-3 py-1"
          title="Delete comment"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
