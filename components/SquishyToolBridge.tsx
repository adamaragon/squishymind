'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CANVAS_TOOLS, executeSquishyTool } from '@/lib/squishy-tools';

const VALID_NAV_PATHS = new Set([
  '/',
  '/signup',
  '/login',
  '/dashboard',
  '/account',
  '/changelog',
]);

type ToolFn = (params: Record<string, unknown>) => unknown | Promise<unknown>;
type CallEventDetail = {
  config?: {
    clientTools?: Record<string, ToolFn>;
  };
};

export default function SquishyToolBridge() {
  const router = useRouter();

  useEffect(() => {
    let detach: (() => void) | null = null;

    function attach(widget: HTMLElement) {
      const onCall = (event: Event) => {
        const detail = (event as CustomEvent<CallEventDetail>).detail;
        const config = detail?.config;
        if (!config) return;

        // Build the clientTools registry the widget will call into.
        const tools: Record<string, ToolFn> = {};

        tools.navigate = (params) => {
          const path = typeof params?.path === 'string' ? params.path : '';
          if (!path.startsWith('/') || !VALID_NAV_PATHS.has(path)) {
            return `invalid path: ${path || '(empty)'}`;
          }
          router.push(path);
          return `navigated to ${path}`;
        };

        for (const name of CANVAS_TOOLS) {
          tools[name] = async (params) => {
            const result = await executeSquishyTool(name, params || {});
            // The agent reads this string back as the tool result. Stringified
            // JSON keeps the structure intact for Squishy to narrate from.
            return JSON.stringify(result);
          };
        }

        config.clientTools = { ...(config.clientTools || {}), ...tools };
      };

      widget.addEventListener('elevenlabs-convai:call', onCall);
      detach = () => widget.removeEventListener('elevenlabs-convai:call', onCall);
    }

    const existing = document.querySelector('elevenlabs-convai') as HTMLElement | null;
    if (existing) {
      attach(existing);
      return () => {
        detach?.();
      };
    }

    // The widget mounts client-side after our SquishyWidget hydrates.
    // Watch for it and attach once it appears.
    const observer = new MutationObserver(() => {
      const found = document.querySelector('elevenlabs-convai') as HTMLElement | null;
      if (found) {
        observer.disconnect();
        attach(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      detach?.();
    };
  }, [router]);

  return null;
}
