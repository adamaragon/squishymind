'use client';

import { useEffect, useState } from 'react';

type Props = {
  /** Override the share URL. Defaults to current page origin + pathname. */
  url?: string;
  /** Headline for the share-card variant. */
  heading?: string;
  /** Sub-text for the share-card variant. */
  blurb?: string;
  /** Share copy used on networks that support a text/title field. */
  text?: string;
  /** Use 'card' for the boxed pre-footer block, 'inline' for a bare row. */
  variant?: 'card' | 'inline';
};

// One-click share targets. The 'href' builder takes the encoded URL +
// optional encoded text and returns a window.open target. We keep all of
// this client-side so no analytics middleman sits between the user and
// the destination.
type Network = {
  key: string;
  label: string;
  brand: string;
  href: (u: string, t: string) => string;
  icon: React.ReactNode;
};

const NETWORKS: Network[] = [
  {
    key: 'x',
    label: 'Share on X',
    brand: '#0f1419',
    href: (u, t) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M18.244 2H21.5l-7.5 8.572L23 22h-6.844l-5.36-7.013L4.6 22H1.34l8.04-9.184L1 2h7.014l4.846 6.41L18.244 2Zm-2.4 18h1.89L7.27 4h-2.03l10.604 16Z" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Share on Facebook',
    brand: '#1877F2',
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M13.5 21.95V13.5h2.86l.43-3.32H13.5V8.05c0-.96.27-1.62 1.65-1.62h1.77V3.46a23.62 23.62 0 0 0-2.58-.13c-2.55 0-4.3 1.56-4.3 4.42v2.46H7.18v3.32h2.86v8.42c.65.1 1.31.15 1.98.15.5 0 .98-.03 1.48-.15Z" />
      </svg>
    ),
  },
  {
    key: 'linkedin',
    label: 'Share on LinkedIn',
    brand: '#0A66C2',
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.84v1.64h.05c.54-1.02 1.85-2.1 3.81-2.1 4.07 0 4.82 2.68 4.82 6.16V21h-4v-5.36c0-1.28-.03-2.93-1.78-2.93-1.78 0-2.05 1.39-2.05 2.83V21H9V9Z" />
      </svg>
    ),
  },
  {
    key: 'reddit',
    label: 'Share on Reddit',
    brand: '#FF4500',
    href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M22 12.07a2.18 2.18 0 0 0-3.7-1.54c-1.46-.95-3.4-1.56-5.55-1.66l1.08-3.4 2.95.68a1.5 1.5 0 1 0 .14-.86l-3.31-.76a.43.43 0 0 0-.52.3l-1.2 3.94c-2.32.06-4.4.66-5.96 1.66A2.18 2.18 0 1 0 4.4 14.4a4.43 4.43 0 0 0-.05.7c0 3.06 3.45 5.55 7.71 5.55s7.7-2.49 7.7-5.55c0-.24-.02-.47-.05-.7A2.18 2.18 0 0 0 22 12.07ZM8 14a1.27 1.27 0 1 1 1.27 1.27A1.26 1.26 0 0 1 8 14Zm6.94 3.4c-.78.79-2.27.85-2.7.85-.43 0-1.92-.06-2.7-.85a.3.3 0 1 1 .42-.42c.49.5 1.55.67 2.28.67.73 0 1.79-.17 2.28-.67a.3.3 0 0 1 .42 0 .3.3 0 0 1 0 .42Zm-.21-2.13A1.27 1.27 0 1 1 16 14a1.26 1.26 0 0 1-1.27 1.27Z" />
      </svg>
    ),
  },
  {
    key: 'whatsapp',
    label: 'Share on WhatsApp',
    brand: '#25D366',
    href: (u, t) => `https://wa.me/?text=${t}%20${u}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M20.5 3.5A10.5 10.5 0 0 0 2.78 16.4L1.5 22.5l6.27-1.25A10.5 10.5 0 1 0 20.5 3.5ZM12 20.4a8.4 8.4 0 0 1-4.27-1.18l-.3-.18-3.7.74.74-3.6-.2-.32A8.4 8.4 0 1 1 12 20.4Zm4.85-6.3c-.27-.13-1.58-.78-1.82-.87-.24-.09-.42-.13-.6.13-.18.27-.7.87-.85 1.05-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.32a8.05 8.05 0 0 1-1.5-1.85c-.16-.27 0-.41.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.83-1.98-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.95 2.58 1.08 2.76.13.18 1.87 2.86 4.54 4 .63.27 1.13.43 1.52.55.64.2 1.22.18 1.68.11.51-.08 1.58-.65 1.8-1.27.22-.62.22-1.16.16-1.27-.07-.11-.24-.18-.51-.31Z" />
      </svg>
    ),
  },
  {
    key: 'telegram',
    label: 'Share on Telegram',
    brand: '#229ED9',
    href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M21.94 4.34a1.16 1.16 0 0 0-1.18-.18L2.62 11.4c-.79.31-.78 1.43.01 1.73l4.45 1.66 1.72 5.5a.7.7 0 0 0 1.15.31l2.65-2.43 4.85 3.58c.6.44 1.45.12 1.6-.6L22.3 5.4a1.16 1.16 0 0 0-.36-1.07ZM9.5 14.9 9 19l-1.3-4.13 10.45-7.27L9.5 14.9Z" />
      </svg>
    ),
  },
  {
    key: 'email',
    label: 'Share via email',
    brand: '#64748b',
    href: (u, t) => `mailto:?subject=${t}&body=${t}%20${u}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
  },
];

export default function ShareButtons({
  url,
  heading = 'Like SquishyMind? Pass it on.',
  blurb = 'Beam this map-maker to a friend on whatever they use.',
  text = 'Your brain, but squishier — check out SquishyMind',
  variant = 'card',
}: Props) {
  // Compute the share URL on mount so SSR doesn't ship a window-dependent
  // value. Server renders an empty href, client hydrates with the real
  // one — anchors stay clickable either way because we open in window.open.
  const [resolvedUrl, setResolvedUrl] = useState(url || '');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url && typeof window !== 'undefined') {
      setResolvedUrl(window.location.origin + window.location.pathname);
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, [url]);

  const encodedUrl = encodeURIComponent(resolvedUrl);
  const encodedText = encodeURIComponent(text);

  function openShare(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=600');
  }

  async function nativeShare() {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({
        title: 'SquishyMind',
        text,
        url: resolvedUrl,
      });
    } catch {
      // User cancelled — that's fine, no-op.
    }
  }

  async function copyLink() {
    if (!resolvedUrl) return;
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access denied — fall back to opening a prompt.
      window.prompt('Copy this URL:', resolvedUrl);
    }
  }

  const buttons = (
    <div className="sb-buttons">
      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="sb-btn sb-btn-native"
          aria-label="Open native share sheet"
          title="Share…"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="m16 6-4-4-4 4" />
            <path d="M12 2v13" />
          </svg>
          <span>Share…</span>
        </button>
      )}
      {NETWORKS.map((n) => (
        <button
          key={n.key}
          type="button"
          onClick={() => openShare(n.href(encodedUrl, encodedText))}
          className="sb-btn"
          aria-label={n.label}
          title={n.label}
          style={{ ['--sb-brand' as string]: n.brand }}
        >
          {n.icon}
        </button>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className={`sb-btn sb-btn-copy ${copied ? 'is-copied' : ''}`}
        aria-label="Copy link to clipboard"
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        <span>{copied ? 'Copied' : 'Copy link'}</span>
      </button>
    </div>
  );

  if (variant === 'inline') {
    return (
      <>
        {buttons}
        <ShareStyles />
      </>
    );
  }

  return (
    <section className="sb-card">
      <div className="sb-card-glow" aria-hidden />
      <div className="sb-card-inner">
        <div className="sb-card-copy">
          <h3 className="sb-heading">{heading}</h3>
          <p className="sb-blurb">{blurb}</p>
        </div>
        {buttons}
      </div>
      <ShareStyles />
    </section>
  );
}

// Styles factored out so both variants share the same scoped JSX block
// without duplicating CSS. The :global wrapper picks up both card and
// inline renders.
function ShareStyles() {
  return (
    <style jsx global>{`
      .sb-card {
        position: relative;
        max-width: 880px;
        margin: 48px auto;
        padding: 28px 28px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background:
          linear-gradient(180deg, rgba(15, 17, 36, 0.6), rgba(10, 11, 22, 0.85));
        overflow: hidden;
        isolation: isolate;
      }
      .sb-card-glow {
        position: absolute;
        inset: -1px;
        z-index: -1;
        background:
          radial-gradient(
            600px 200px at 20% 0%,
            rgba(236, 72, 153, 0.18),
            transparent 60%
          ),
          radial-gradient(
            500px 200px at 80% 100%,
            rgba(6, 182, 212, 0.15),
            transparent 60%
          );
        pointer-events: none;
      }
      .sb-card-inner {
        display: flex;
        flex-direction: column;
        gap: 18px;
        align-items: flex-start;
      }
      @media (min-width: 720px) {
        .sb-card-inner {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }
      }
      .sb-card-copy {
        min-width: 0;
      }
      .sb-heading {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 4px;
        background: linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .sb-blurb {
        font-size: 13px;
        color: var(--text-dim, #a1a1aa);
        margin: 0;
        line-height: 1.5;
      }
      .sb-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .sb-btn {
        --sb-brand: #64748b;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 34px;
        padding: 0 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text, #e5e7eb);
        border-radius: 9px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition:
          background 0.16s,
          border-color 0.16s,
          color 0.16s,
          transform 0.16s;
        font-family: inherit;
      }
      .sb-btn:hover {
        background: color-mix(in srgb, var(--sb-brand) 75%, rgba(0, 0, 0, 0.2));
        border-color: var(--sb-brand);
        color: white;
        transform: translateY(-1px);
      }
      .sb-btn:active {
        transform: translateY(0);
      }
      .sb-btn:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--sb-brand) 80%, white);
        outline-offset: 2px;
      }
      /* Icon-only buttons (the network ones) — square shape, no text. */
      .sb-btn[aria-label^='Share on'] {
        padding: 0;
        width: 34px;
        justify-content: center;
      }
      .sb-btn-native {
        --sb-brand: #8b5cf6;
      }
      .sb-btn-copy {
        --sb-brand: #06b6d4;
      }
      .sb-btn-copy.is-copied {
        background: rgba(16, 185, 129, 0.16);
        border-color: rgba(16, 185, 129, 0.5);
        color: #6ee7b7;
      }
    `}</style>
  );
}
