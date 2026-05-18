// Client-side analytics tracker. Single fire-and-forget POST to /api/track.
// Generates a sticky anon_id in localStorage so signed-out → signed-in funnels
// remain connectable.

const ANON_KEY = 'squishymind:anon-id';

function anonId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      // 14-char base36 timestamp + random — collision-proof enough for beta.
      id =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function track(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  // Skip in dev to avoid filling the events table during local development.
  if (process.env.NODE_ENV !== 'production') return;

  const body = JSON.stringify({
    event,
    properties: properties ?? {},
    path: window.location.pathname,
    anonId: anonId(),
  });

  // sendBeacon survives page navigation (great for "share_link_copied" right
  // before a click navigates away); fall back to fetch keepalive when it's
  // not available (Firefox in private mode etc.).
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/track', blob);
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* swallow — analytics must never break the host page */
  });
}
