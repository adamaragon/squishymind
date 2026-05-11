'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { templates } from '@/lib/templates';
import { createClient } from '@/lib/supabase/client';

export default function TemplatePicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function createFromTemplate(templateId: string | null) {
    setCreating(templateId || 'blank');
    setError(null);
    const template = templateId ? templates.find((t) => t.id === templateId) : null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in.');
      setCreating(null);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('mindmaps')
      .insert({
        owner_id: user.id,
        title: template?.name || 'Untitled mind map',
        data: template?.data || { nodes: {}, childIndex: {}, rootId: null },
      })
      .select('id')
      .single();
    if (insertError || !data) {
      setError(insertError?.message || 'Could not create map.');
      setCreating(null);
      return;
    }
    router.push(`/m/${data.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pick a template"
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-8"
      >
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-2xl font-semibold">Start from a template</h2>
          <button
            onClick={onClose}
            className="text-[--text-dim] hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-[--text-dim] mb-6">
          Pick a starting point, or go blank. You can change anything.
        </p>

        <div className="grid md:grid-cols-3 gap-3">
          <button
            onClick={() => createFromTemplate(null)}
            disabled={creating !== null}
            className="glass rounded-xl p-5 text-left hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-medium mb-1">Blank canvas</h3>
            <p className="text-xs text-[--text-dim] leading-relaxed">
              Start with just the brain.
            </p>
          </button>

          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => createFromTemplate(t.id)}
              disabled={creating !== null}
              className="glass rounded-xl p-5 text-left hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              <div className="text-3xl mb-2">{t.icon}</div>
              <h3 className="font-medium mb-1">{t.name}</h3>
              <p className="text-xs text-[--text-dim] leading-relaxed">{t.description}</p>
            </button>
          ))}
        </div>

        {creating && (
          <p className="text-center text-sm text-[--text-dim] mt-6">Creating your map…</p>
        )}
        {error && <p className="text-center text-sm text-red-300 mt-4">{error}</p>}
      </div>
    </div>
  );
}
