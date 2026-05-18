'use client';

import { useEffect, useRef, useState } from 'react';
import type { Attachment, MindMapNode } from '@/lib/types';
import { iconForAttachment, humanSize } from '@/lib/attachments';

type Props = {
  node: MindMapNode;
  readonly?: boolean;
  accentColor: string;
  /** Called with the next version of the node on any local edit (label, note,
   *  imageUrl, attachments). Parent view is expected to merge it into the
   *  MindMapData tree and call onDataChange. */
  onChange: (next: MindMapNode) => void;
  /** Optional — when provided, a delete control is shown for non-root nodes.
   *  Parent is expected to remove the node + its subtree and close the panel. */
  onDelete?: () => void;
  onClose: () => void;
  isRoot: boolean;
};

const NOTE_DEBOUNCE_MS = 600;

export default function NodeDetailPanel({
  node,
  readonly = false,
  accentColor,
  onChange,
  onDelete,
  onClose,
  isRoot,
}: Props) {
  const [label, setLabel] = useState(node.label);
  const [note, setNote] = useState(node.note || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Reset local state when a different node is opened.
  useEffect(() => {
    setLabel(node.label);
    setNote(node.note || '');
    setError(null);
  }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Autofocus the title field on open so editing is one keystroke away.
  useEffect(() => {
    const el = panelRef.current?.querySelector<HTMLInputElement>(
      '.nd-title-input',
    );
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, [node.id]);

  function commitLabel(value: string) {
    onChange({ ...node, label: value });
  }
  function commitNote(value: string) {
    onChange({ ...node, note: value });
  }

  function onLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLabel(v);
    if (labelTimer.current) clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => commitLabel(v), 400);
  }

  function onNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setNote(v);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => commitNote(v), NOTE_DEBOUNCE_MS);
  }

  async function uploadImage(file: File) {
    setError(null);
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `upload failed (${res.status})`);
      }
      onChange({ ...node, imageUrl: body.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'image upload failed');
    } finally {
      setUploadingImage(false);
    }
  }

  async function uploadAttachment(file: File) {
    setError(null);
    setUploadingAttach(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/attachments', { method: 'POST', body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === 'too_large') {
          throw new Error('Too large (10 MB max).');
        }
        if (body?.error === 'bad_type') {
          throw new Error(
            `That file type isn't supported (${body.type || 'unknown'}).`,
          );
        }
        throw new Error(body?.error || `upload failed (${res.status})`);
      }
      const att: Attachment = {
        url: body.url,
        name: body.name,
        type: body.type,
        size: body.size,
      };
      onChange({
        ...node,
        attachments: [...(node.attachments || []), att],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'attachment upload failed');
    } finally {
      setUploadingAttach(false);
    }
  }

  function removeImage() {
    onChange({ ...node, imageUrl: null });
  }

  function removeAttachment(url: string) {
    onChange({
      ...node,
      attachments: (node.attachments || []).filter((a) => a.url !== url),
    });
  }

  const attachments = node.attachments || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="nd-backdrop"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        ref={panelRef}
        className="nd-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${node.label || 'this node'}`}
        style={{ ['--nd-accent' as string]: accentColor }}
      >
        {/* Header */}
        <header className="nd-head">
          <div className="nd-head-top">
            <span className="nd-color-dot" aria-hidden />
            <span className="nd-head-kicker">
              {isRoot ? 'Root node' : 'Node detail'}
            </span>
            <button
              type="button"
              className="nd-close"
              onClick={onClose}
              aria-label="Close panel"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
          <input
            value={label}
            onChange={onLabelChange}
            placeholder={isRoot ? 'Untitled mind map' : 'Untitled'}
            spellCheck={false}
            readOnly={readonly}
            className="nd-title-input"
            aria-label="Node label"
          />
          <div className="nd-meta-row">
            <span className="nd-meta-pill">
              Color · idx {node.colorIdx}
            </span>
            <span className="nd-meta-pill">
              Depth · {node.depth}
            </span>
            {node.createdAt > 0 && (
              <span className="nd-meta-pill">
                Created {new Date(node.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </header>

        <div className="nd-body">
          {/* Note */}
          <section className="nd-section">
            <header className="nd-section-head">
              <h3>
                <span className="nd-section-icon" aria-hidden>≡</span>
                Note
              </h3>
              <span className="nd-section-help">
                {readonly ? 'Read-only' : 'Markdown not yet — plain text'}
              </span>
            </header>
            <textarea
              value={note}
              onChange={onNoteChange}
              placeholder={
                readonly
                  ? 'No note for this node.'
                  : 'Add a note — context, links, anything that won\'t fit on the card.'
              }
              readOnly={readonly}
              rows={6}
              className="nd-note"
              aria-label="Node note"
            />
          </section>

          {/* Image */}
          <section className="nd-section">
            <header className="nd-section-head">
              <h3>
                <span className="nd-section-icon" aria-hidden>🖼</span>
                Image
              </h3>
              {!readonly && (
                <button
                  type="button"
                  className="nd-link-btn"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage
                    ? 'Uploading…'
                    : node.imageUrl
                    ? 'Replace'
                    : 'Upload'}
                </button>
              )}
            </header>
            {node.imageUrl ? (
              <div className="nd-image-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={node.imageUrl}
                  alt="Attached image"
                  className="nd-image"
                />
                {!readonly && (
                  <button
                    type="button"
                    className="nd-image-remove"
                    onClick={removeImage}
                    title="Remove image"
                  >
                    Remove image
                  </button>
                )}
              </div>
            ) : (
              <div className="nd-empty-slot">
                {readonly ? 'No image attached.' : 'No image yet. PNG / JPG / WEBP / GIF up to 5 MB.'}
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = '';
              }}
            />
          </section>

          {/* Attachments */}
          <section className="nd-section">
            <header className="nd-section-head">
              <h3>
                <span className="nd-section-icon" aria-hidden>📎</span>
                Attachments
                {attachments.length > 0 && (
                  <span className="nd-section-count">{attachments.length}</span>
                )}
              </h3>
              {!readonly && (
                <button
                  type="button"
                  className="nd-link-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttach}
                >
                  {uploadingAttach ? 'Uploading…' : '+ Add file'}
                </button>
              )}
            </header>

            {attachments.length === 0 ? (
              <div className="nd-empty-slot">
                {readonly
                  ? 'No attachments on this node.'
                  : 'Drop a PDF, doc, zip, image, audio, or video. 10 MB cap.'}
              </div>
            ) : (
              <ul className="nd-attach-list">
                {attachments.map((a) => (
                  <li key={a.url} className="nd-attach">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="nd-attach-link"
                      title={`Open ${a.name} in a new tab`}
                    >
                      <span className="nd-attach-icon" aria-hidden>
                        {iconForAttachment(a.type)}
                      </span>
                      <span className="nd-attach-meta">
                        <span className="nd-attach-name">{a.name}</span>
                        <span className="nd-attach-sub">
                          {a.type.split('/').pop() || 'file'}
                          {a.size ? ` · ${humanSize(a.size)}` : ''}
                        </span>
                      </span>
                    </a>
                    {!readonly && (
                      <button
                        type="button"
                        className="nd-attach-remove"
                        onClick={() => removeAttachment(a.url)}
                        aria-label={`Remove ${a.name}`}
                        title="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAttachment(f);
                e.target.value = '';
              }}
            />
          </section>

          {error && (
            <div className="nd-error" role="alert">
              {error}
            </div>
          )}

          {/* Delete — only for non-root nodes when the parent view passed
              an onDelete handler. Sits at the bottom because it's
              destructive and shouldn't be on the natural scan path. */}
          {!readonly && !isRoot && onDelete && (
            <section className="nd-danger">
              <button
                type="button"
                className="nd-delete-btn"
                onClick={() => {
                  if (
                    typeof window === 'undefined' ||
                    window.confirm(
                      `Delete "${node.label || 'this node'}" and everything beneath it? This can't be undone here.`,
                    )
                  ) {
                    onDelete();
                  }
                }}
              >
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 3.5 H 11.5" />
                  <path d="M4 3.5 V 2.5 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 V 3.5" />
                  <path d="M3.5 3.5 V 11.5 a1 1 0 0 0 1 1 h5 a1 1 0 0 0 1 -1 V 3.5" />
                </svg>
                Delete this node and subtree
              </button>
            </section>
          )}

          <footer className="nd-foot">
            <span>
              Edits sync to the canvas in real time. Close with{' '}
              <kbd>Esc</kbd>.
            </span>
          </footer>
        </div>
      </aside>

      <style jsx>{`
        .nd-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 50;
          animation: nd-fade 0.18s ease;
        }
        @keyframes nd-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .nd-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(420px, 100%);
          background: linear-gradient(
              180deg,
              rgba(15, 17, 36, 0.95) 0%,
              rgba(10, 11, 22, 0.97) 100%
            );
          border-left: 1px solid var(--border-strong);
          box-shadow:
            -28px 0 60px rgba(0, 0, 0, 0.55),
            inset 1px 0 0 rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          z-index: 51;
          display: flex;
          flex-direction: column;
          animation: nd-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--text);
        }
        @keyframes nd-in {
          from {
            transform: translateX(28px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* ---- Header ---- */
        .nd-head {
          padding: 18px 20px 14px;
          border-bottom: 1px solid var(--border);
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--nd-accent) 18%, transparent),
              transparent 70%
            );
        }
        .nd-head-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .nd-color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--nd-accent);
          box-shadow:
            0 0 0 2px color-mix(in srgb, var(--nd-accent) 25%, transparent),
            0 0 14px var(--nd-accent);
        }
        .nd-head-kicker {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--text-dim);
          flex: 1;
        }
        .nd-close {
          background: transparent;
          color: var(--text-dim);
          border: 1px solid var(--border);
          width: 26px;
          height: 26px;
          border-radius: 7px;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.12s;
        }
        .nd-close:hover {
          color: var(--text);
          border-color: var(--border-strong);
          background: rgba(255, 255, 255, 0.05);
        }
        .nd-title-input {
          width: 100%;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text);
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.2px;
          padding: 6px 10px;
          margin: 0 -10px;
          border-radius: 8px;
          outline: none;
          transition: all 0.15s;
        }
        .nd-title-input:hover:not(:focus):not([readonly]) {
          background: rgba(255, 255, 255, 0.03);
        }
        .nd-title-input:focus {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--border-strong);
        }
        .nd-title-input::placeholder {
          color: var(--text-dim);
          font-style: italic;
        }
        .nd-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .nd-meta-pill {
          font-size: 10px;
          color: var(--text-dim);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          padding: 3px 8px;
          border-radius: 999px;
        }

        /* ---- Body ---- */
        .nd-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 18px 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .nd-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nd-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .nd-section-head h3 {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--text);
        }
        .nd-section-icon {
          color: var(--nd-accent);
          font-size: 14px;
        }
        .nd-section-count {
          background: color-mix(in srgb, var(--nd-accent) 22%, transparent);
          color: var(--text);
          border: 1px solid color-mix(in srgb, var(--nd-accent) 40%, transparent);
          font-size: 10px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 999px;
          margin-left: 2px;
          font-variant-numeric: tabular-nums;
        }
        .nd-section-help {
          font-size: 10px;
          color: var(--text-dim);
          font-style: italic;
        }
        .nd-link-btn {
          background: transparent;
          color: var(--nd-accent);
          border: 1px solid color-mix(in srgb, var(--nd-accent) 40%, transparent);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .nd-link-btn:hover {
          background: color-mix(in srgb, var(--nd-accent) 14%, transparent);
        }
        .nd-link-btn:disabled {
          opacity: 0.5;
          cursor: progress;
        }

        /* ---- Note ---- */
        .nd-note {
          width: 100%;
          min-height: 96px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font: inherit;
          font-size: 13px;
          line-height: 1.5;
          padding: 10px 12px;
          outline: none;
          resize: vertical;
          transition: border-color 0.15s;
        }
        .nd-note:focus {
          border-color: var(--nd-accent);
        }
        .nd-note::placeholder {
          color: var(--text-dim);
          font-style: italic;
        }

        /* ---- Image ---- */
        .nd-image-wrap {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.3);
          padding: 6px;
        }
        .nd-image {
          width: 100%;
          max-height: 220px;
          object-fit: contain;
          border-radius: 6px;
          display: block;
        }
        .nd-image-remove {
          margin-top: 6px;
          width: 100%;
          background: transparent;
          color: var(--text-dim);
          border: 1px solid var(--border);
          font-size: 11px;
          padding: 5px 0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .nd-image-remove:hover {
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.45);
          background: rgba(239, 68, 68, 0.08);
        }
        .nd-empty-slot {
          font-size: 12px;
          color: var(--text-dim);
          font-style: italic;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 14px;
          text-align: center;
        }

        /* ---- Attachments ---- */
        .nd-attach-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nd-attach {
          display: flex;
          align-items: stretch;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.15s;
        }
        .nd-attach:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: color-mix(in srgb, var(--nd-accent) 35%, var(--border));
        }
        .nd-attach-link {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          color: var(--text);
          text-decoration: none;
          min-width: 0;
        }
        .nd-attach-icon {
          font-size: 22px;
          line-height: 1;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
        }
        .nd-attach-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          overflow: hidden;
        }
        .nd-attach-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nd-attach-sub {
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .nd-attach-remove {
          background: transparent;
          color: var(--text-dim);
          border: none;
          border-left: 1px solid var(--border);
          width: 32px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .nd-attach-remove:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.08);
        }

        /* ---- Danger / Delete ---- */
        .nd-danger {
          margin-top: 4px;
          padding-top: 16px;
          border-top: 1px dashed var(--border);
        }
        .nd-delete-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 12px;
          font-weight: 500;
          padding: 9px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .nd-delete-btn:hover {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.55);
          color: #fee2e2;
        }

        /* ---- Error ---- */
        .nd-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 8px;
        }

        /* ---- Foot ---- */
        .nd-foot {
          font-size: 11px;
          color: var(--text-dim);
          text-align: center;
          padding-top: 6px;
          border-top: 1px dashed var(--border);
        }
        .nd-foot :global(kbd) {
          display: inline-block;
          padding: 1px 5px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          color: var(--text);
          margin: 0 2px;
        }
      `}</style>
    </>
  );
}
