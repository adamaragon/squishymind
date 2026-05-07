'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const VALID_PATHS = new Set(['/', '/signup', '/login', '/dashboard', '/account']);

export default function SquishyToolBridge() {
  const router = useRouter();

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail || {};
      const name = detail.name || detail.tool_name;
      const params = detail.parameters || detail.parameters_json;
      if (name !== 'navigate') return;
      const path = params?.path;
      if (typeof path !== 'string' || !path.startsWith('/')) return;
      // Whitelist defends against agent hallucinating arbitrary paths.
      if (!VALID_PATHS.has(path)) return;
      router.push(path);
    }

    const events = [
      'elevenlabs-convai:client-tool',
      'elevenlabs-convai:tool-call',
      'convai-tool-call',
    ];
    events.forEach((n) => window.addEventListener(n, handler));
    return () => events.forEach((n) => window.removeEventListener(n, handler));
  }, [router]);

  return null;
}
