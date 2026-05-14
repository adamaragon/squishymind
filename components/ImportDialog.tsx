'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'upload' | 'paste';

export default function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upload');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(fileName: string, contents: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contents }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Import failed');
        return;
      }
      router.push(`/m/${body.mindmap_id}`);
    } catch {
      setError('Network error — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    const contents = await file.text();
    await submit(file.name, contents);
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
        aria-label="Import a mind map"
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl max-w-2xl w-full p-7"
      >
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-xl font-semibold">Import a mind map</h2>
          <button
            onClick={onClose}
            className="text-[--text-dim] hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-[--text-dim] mb-5">
          Drop in a Markdown file or a CSV. OPML and JSON support coming next.
        </p>

        <div className="flex gap-1 mb-4 border-b border-white/10">
          <button
            onClick={() => setTab('upload')}
            className={`px-3 py-2 text-sm transition-colors ${
              tab === 'upload'
                ? 'border-b-2 border-violet-500 text-white'
                : 'text-[--text-dim] hover:text-white'
            }`}
          >
            Upload file
          </button>
          <button
            onClick={() => setTab('paste')}
            className={`px-3 py-2 text-sm transition-colors ${
              tab === 'paste'
                ? 'border-b-2 border-violet-500 text-white'
                : 'text-[--text-dim] hover:text-white'
            }`}
          >
            Paste text
          </button>
        </div>

        {tab === 'upload' ? (
          <div className="border border-dashed border-white/20 rounded-xl p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
              id="import-file"
              disabled={busy}
            />
            <label
              htmlFor="import-file"
              className={`btn btn-primary cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}
            >
              {busy ? 'Importing…' : 'Choose a file'}
            </label>
            <p className="text-xs text-[--text-dim] mt-3">
              .md, .markdown, .txt, .csv — up to 2&nbsp;MB
            </p>
          </div>
        ) : (
          <div>
            <textarea
              className="input min-h-[200px] font-mono text-xs w-full"
              placeholder={`# My map\n\n## Branch one\n- child\n- another child\n\n## Branch two\n- ...`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
            <button
              onClick={() => submit('Pasted import.md', text)}
              className="btn btn-primary text-sm mt-3"
              disabled={busy || !text.trim()}
            >
              {busy ? 'Importing…' : 'Import'}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-300 mt-3">{error}</p>}

        <div className="mt-6 pt-5 border-t border-white/10 text-xs text-[--text-dim] leading-relaxed space-y-2">
          <div>
            <strong className="text-white">Markdown:</strong> headings nest
            into a tree (the topmost <code>#</code> becomes the brain). Bullet
            and numbered lists become children. Indented lists make a deeper
            tree. Plain lines after a heading or bullet become that node’s note.
          </div>
          <div>
            <strong className="text-white">CSV:</strong> include either a
            <code className="mx-1">label</code> + <code>parent_label</code>{' '}
            column set, or a single <code>path</code> column with{' '}
            <code>{`Parent > Child > Leaf`}</code> rows. Optional{' '}
            <code>note</code> and <code>color_idx</code> (0–4) columns work
            with both shapes.
          </div>
        </div>
      </div>
    </div>
  );
}
