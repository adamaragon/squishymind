'use client';

import { useEffect, useRef, useState } from 'react';
import type { Visibility } from '@/lib/types';

type Props = {
  mindmapId: string;
  /** Vanity slug if the user has set one; share link uses it when present. */
  slug?: string | null;
  initialVisibility: Visibility;
  initialShareToken: string;
  onClose: () => void;
  onChange?: (next: { visibility: Visibility; shareToken: string }) => void;
};

const VISIBILITY_OPTIONS: { value: Visibility; label: string; help: string }[] = [
  { value: 'private', label: 'Private', help: 'Only you and invited collaborators can see this map.' },
  { value: 'unlisted', label: 'Unlisted', help: 'Anyone with the link can view (read-only). Not in any public list.' },
  { value: 'public', label: 'Public', help: 'Anyone can view. Will appear in the public gallery (gallery coming soon).' },
];

export default function ShareDialog({
  mindmapId,
  slug,
  initialVisibility,
  initialShareToken,
  onClose,
  onChange,
}: Props) {
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [savingVisibility, setSavingVisibility] = useState<Visibility | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Slug share URL is prettier and easier to remember; falls back to the
  // unguessable token when no slug is set. Slug-based URLs are guessable
  // by anyone who knows the slug — the visibility filter on /share still
  // gates access (private maps stay private even if their slug is known).
  const shareUrl = slug
    ? `${origin}/share/${slug}`
    : `${origin}/share/${shareToken}`;
  const linkDisabled = visibility === 'private';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  async function changeVisibility(next: Visibility) {
    if (next === visibility) return;
    setError(null);
    setSavingVisibility(next);
    const prev = visibility;
    setVisibility(next);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'save failed');
      onChange?.({ visibility: next, shareToken });
    } catch (e) {
      setVisibility(prev);
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSavingVisibility(null);
    }
  }

  async function regenerate() {
    if (regenerating) return;
    if (!confirm('Regenerate the share link? The old link will stop working immediately.')) return;
    setError(null);
    setRegenerating(true);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/regenerate-token`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.share_token) throw new Error(body?.error || 'regenerate failed');
      setShareToken(body.share_token);
      setCopied(false);
      onChange?.({ visibility, shareToken: body.share_token });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'regenerate failed');
    } finally {
      setRegenerating(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Share this mind map"
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl p-6 w-full max-w-md mx-4 outline-none"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Share this map</h2>
            <p className="text-xs text-[--text-dim] mt-1">Pick who can see it.</p>
          </div>
          <button
            onClick={onClose}
            className="text-[--text-dim] hover:text-white transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <fieldset className="space-y-2 mb-5">
          <legend className="sr-only">Visibility</legend>
          {VISIBILITY_OPTIONS.map((opt) => {
            const checked = visibility === opt.value;
            const saving = savingVisibility === opt.value;
            return (
              <label
                key={opt.value}
                className={`block rounded-xl border p-3 cursor-pointer transition-colors ${
                  checked
                    ? 'border-white/30 bg-white/5'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={checked}
                    onChange={() => changeVisibility(opt.value)}
                    disabled={savingVisibility !== null}
                    className="accent-white"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                  {saving && <span className="text-xs text-[--text-dim]">saving…</span>}
                </div>
                <p className="text-xs text-[--text-dim] mt-1.5 ml-6">{opt.help}</p>
              </label>
            );
          })}
        </fieldset>

        <div className={`mb-3 transition-opacity ${linkDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-2">
            Share link
          </label>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="input flex-1 text-xs font-mono"
              aria-label="Share URL"
            />
            <button
              onClick={copy}
              disabled={linkDisabled}
              className="btn btn-ghost text-xs px-3 py-2 shrink-0"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={regenerate}
            disabled={linkDisabled || regenerating}
            className="text-xs text-[--text-dim] hover:text-white transition-colors mt-2 disabled:opacity-50"
          >
            {regenerating ? 'Regenerating…' : '↻ Regenerate link (old one stops working)'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-300 mt-2" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
