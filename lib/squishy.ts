const STORAGE_KEY = 'squishymind:conversation-id';

/** Translate a Next.js pathname into a human-friendly page name for the agent. */
export function pathToPageName(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/signup') return 'signup';
  if (pathname === '/login') return 'login';
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/account') return 'account';
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
