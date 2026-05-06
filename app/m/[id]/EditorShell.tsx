'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ShareDialog from '@/components/ShareDialog';
import MindMapCanvas from '@/components/MindMapCanvas';
import type { MindMapData, Visibility } from '@/lib/types';

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

type SlugState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
type SaveState = 'idle' | 'saving' | 'error';

export default function EditorShell({
  id,
  initialTitle,
  initialSlug,
  initialVisibility,
  initialShareToken,
  initialData,
}: {
  id: string;
  initialTitle: string;
  initialSlug: string;
  initialVisibility: Visibility;
  initialShareToken: string;
  initialData: MindMapData;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [slugInput, setSlugInput] = useState(initialSlug);
  const [slugState, setSlugState] = useState<SlugState>('idle');
  const [slugOpen, setSlugOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [shareToken, setShareToken] = useState(initialShareToken);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const dataTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataRef = useRef<MindMapData>(initialData);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Re-render once a minute so "Saved · Xs ago" stays current.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const persistData = useCallback(async (data: MindMapData) => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/mindmaps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error('save failed');
      setSavedAt(Date.now());
      setSaveState('idle');
    } catch {
      setSaveState('error');
    }
  }, [id]);

  const onDataChange = useCallback((data: MindMapData) => {
    lastDataRef.current = data;
    if (dataTimer.current) clearTimeout(dataTimer.current);
    dataTimer.current = setTimeout(() => persistData(data), 800);
  }, [persistData]);

  function retrySave() {
    persistData(lastDataRef.current);
  }

  async function persistTitle(value: string) {
    setSaving(true);
    await supabase.from('mindmaps').update({ title: value }).eq('id', id);
    setSaving(false);
  }

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => persistTitle(value || 'Untitled mind map'), 600);
  }

  async function checkSlug(value: string) {
    if (!value) { setSlugState('idle'); return; }
    setSlugState('checking');
    const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(value)}&excludeId=${id}`);
    const data = await res.json();
    if (data.reason === 'invalid characters') setSlugState('invalid');
    else setSlugState(data.available ? 'available' : 'taken');
  }

  function onSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInput(raw);
    setSlugState('idle');
    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (raw) slugTimer.current = setTimeout(() => checkSlug(raw), 400);
    else setSlugState('idle');
  }

  async function saveSlug() {
    if (slugState !== 'available' && slugInput !== slug) return;
    const newSlug = slugInput || null;
    setSaving(true);
    await supabase.from('mindmaps').update({ slug: newSlug }).eq('id', id);
    setSaving(false);
    setSlug(slugInput);
    setSlugOpen(false);
    if (newSlug) router.replace(`/m/${newSlug}`);
  }

  function onSlugKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveSlug();
    if (e.key === 'Escape') { setSlugInput(slug); setSlugOpen(false); setSlugState('idle'); }
  }

  function formatSavedAgo(): string {
    if (!savedAt) return 'Saved';
    const sec = Math.max(1, Math.round((Date.now() - savedAt) / 1000));
    if (sec < 60) return `Saved · ${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `Saved · ${min}m ago`;
    const hr = Math.round(min / 60);
    return `Saved · ${hr}h ago`;
  }

  const slugIndicator: Record<SlugState, { text: string; color: string }> = {
    idle:      { text: '',                                    color: '' },
    checking:  { text: 'checking…',                          color: 'text-[--text-dim]' },
    available: { text: '✓ available',                        color: 'text-emerald-400' },
    taken:     { text: '✗ taken',                            color: 'text-red-400' },
    invalid:   { text: '✗ letters, numbers & hyphens only',  color: 'text-red-400' },
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* slim top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-[--ui-bg] backdrop-blur shrink-0 flex-wrap">
        <Link href="/dashboard" className="text-[--text-dim] hover:text-white transition-colors text-sm shrink-0">
          ← Maps
        </Link>

        <input
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-[--text-dim] min-w-0"
          value={title}
          onChange={onTitleChange}
          placeholder="Untitled mind map"
          spellCheck={false}
        />

        {/* vanity URL pill */}
        <div className="flex items-center gap-2 shrink-0">
          {!slugOpen ? (
            <button
              onClick={() => { setSlugInput(slug || toSlug(title)); setSlugOpen(true); checkSlug(slug || toSlug(title)); }}
              className="text-xs text-[--text-dim] hover:text-white transition-colors border border-white/10 rounded-full px-3 py-1"
            >
              {slug ? `/${slug}` : 'Set vanity URL'}
            </button>
          ) : (
            <div className="flex items-center gap-2 border border-white/15 rounded-full px-3 py-1 bg-white/5">
              <span className="text-xs text-[--text-dim] shrink-0">{origin}/m/</span>
              <input
                autoFocus
                className="bg-transparent border-none outline-none text-xs text-white w-32"
                value={slugInput}
                onChange={onSlugChange}
                onKeyDown={onSlugKeyDown}
                placeholder={toSlug(title) || 'my-map'}
                spellCheck={false}
              />
              <span className={`text-xs shrink-0 ${slugIndicator[slugState].color}`}>
                {slugIndicator[slugState].text}
              </span>
              <button
                onClick={saveSlug}
                disabled={slugState !== 'available' && slugInput !== slug}
                className="text-xs text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-emerald-300 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setSlugInput(slug); setSlugOpen(false); setSlugState('idle'); }}
                className="text-xs text-[--text-dim] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* share button */}
        <button
          onClick={() => setShareOpen(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.8 7.2l4.4-2.4M5.8 8.8l4.4 2.4" />
          </svg>
          Share
        </button>

        {/* save indicator */}
        <span className="text-xs text-[--text-dim] shrink-0 min-w-[5rem] text-right" aria-live="polite">
          {saveState === 'saving' ? (
            'Saving…'
          ) : saveState === 'error' ? (
            <button
              onClick={retrySave}
              className="text-red-300 hover:text-red-200 transition-colors"
            >
              ● Couldn’t save — retry
            </button>
          ) : savedAt ? (
            formatSavedAgo()
          ) : saving ? (
            'Saving…'
          ) : (
            ''
          )}
        </span>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MindMapCanvas
          key={id}
          mindmapId={id}
          initialData={initialData}
          initialTitle={title}
          onDataChange={onDataChange}
          onTitleChange={(next) => {
            setTitle(next);
            if (titleTimer.current) clearTimeout(titleTimer.current);
            titleTimer.current = setTimeout(() => persistTitle(next || 'Untitled mind map'), 600);
          }}
        />
      </div>

      {shareOpen && (
        <ShareDialog
          mindmapId={id}
          initialVisibility={visibility}
          initialShareToken={shareToken}
          onClose={() => setShareOpen(false)}
          onChange={({ visibility: v, shareToken: t }) => {
            setVisibility(v);
            setShareToken(t);
          }}
        />
      )}
    </div>
  );
}
