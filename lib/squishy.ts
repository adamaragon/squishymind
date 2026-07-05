const STORAGE_KEY = 'squishymind:conversation-id';

/** Translate a Next.js pathname into a human-friendly page name for the agent.
 *  The string lands in Squishy's `current_page` dynamic variable so the agent
 *  can pitch to the right context. Keep names short and lowercased — the
 *  ElevenLabs prompt branches on exact-match values. */
export function pathToPageName(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/signup') return 'signup';
  if (pathname === '/login') return 'login';
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/account') return 'account';
  if (pathname === '/pricing') return 'pricing';
  if (pathname === '/founder-access') return 'founder access';
  if (pathname === '/changelog') return 'changelog';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/m/')) return 'mind map editor';
  if (pathname.startsWith('/share/')) return 'shared map viewer';
  return 'unknown page';
}

/** Read a saved conversation ID, returning null if absent or storage unavailable. */
export function loadConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Save a conversation ID to localStorage. Silent no-op on failure. */
export function saveConversationId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode, quota, etc. */
  }
}

/** Clear the saved conversation ID. Call on sign-out or explicit reset. */
export function clearConversationId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---- View mode persistence (per-user via localStorage) ----
import type { ViewMode } from './types';

const VIEW_MODE_KEY = 'squishymind:view-mode';

export function loadViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'canvas';
  try {
    const v = window.localStorage.getItem(VIEW_MODE_KEY);
    if (v === 'canvas' || v === 'tree' || v === 'outline' || v === 'table' || v === 'gallery') {
      return v;
    }
  } catch {
    /* ignore */
  }
  return 'canvas';
}

export function saveViewMode(mode: ViewMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
