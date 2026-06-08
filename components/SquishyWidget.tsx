'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  pathToPageName,
  loadConversationId,
  saveConversationId,
} from '@/lib/squishy';
import { createClient } from '@/lib/supabase/client';

const AGENT_ID = 'agent_1701kqznwkttftqavkgq9gg1ct1p';

// Loose shape of the convai-widget custom element. Real widget exposes one
// of these methods depending on version; we feature-detect rather than
// importing types we don't have.
type ConvaiElement = HTMLElement & {
  setDynamicVariables?: (vars: Record<string, string>) => void;
  updateDynamicVariables?: (vars: Record<string, string>) => void;
};

export default function SquishyWidget() {
  const pathname = usePathname();
  const widgetRef = useRef<HTMLElement | null>(null);
  const [resumedId, setResumedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Auth is resolved client-side so the root layout can stay static (no
  // server-side cookie read). Starts logged-out for the first paint, then
  // resolves once Supabase answers and on any future auth-state change.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Count of other collaborators currently in the open map. The canvas
  // dispatches 'squishymind:collaborator-count' on presence sync; we push it
  // to the agent as a dynamic variable so Squishy can mention them naturally.
  const [collaboratorCount, setCollaboratorCount] = useState(0);

  // On first mount, attempt to resume an existing conversation from localStorage.
  useEffect(() => {
    setResumedId(loadConversationId());
    setMounted(true);
  }, []);

  // Resolve auth client-side (keeps the layout — and every public page —
  // statically renderable). Updates on sign-in / sign-out too.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsLoggedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Listen for collaborator count broadcasts from the canvas.
  useEffect(() => {
    function onCount(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.count === 'number') {
        setCollaboratorCount(Math.max(0, Math.floor(detail.count)));
      }
    }
    window.addEventListener('squishymind:collaborator-count', onCount);
    return () => window.removeEventListener('squishymind:collaborator-count', onCount);
  }, []);

  // Save conversation ID to localStorage when one starts.
  useEffect(() => {
    function onStart(e: Event) {
      const detail = (e as CustomEvent).detail || {};
      const id = detail.conversation_id || detail.conversationId || detail.id;
      if (typeof id === 'string' && id.length > 0) {
        saveConversationId(id);
      }
    }
    // Cover several plausible event names across widget versions.
    const events = [
      'elevenlabs-convai:call-start',
      'elevenlabs-convai:conversation-start',
      'convai-conversation-start',
    ];
    events.forEach((n) => window.addEventListener(n, onStart));
    return () => events.forEach((n) => window.removeEventListener(n, onStart));
  }, []);

  // When the route, auth state, or collaborator count changes, push the new
  // variables into the agent.
  useEffect(() => {
    const el = widgetRef.current as ConvaiElement | null;
    if (!el) return;
    const vars = {
      current_page: pathToPageName(pathname),
      is_logged_in: isLoggedIn ? 'yes' : 'no',
      collaborator_count: String(collaboratorCount),
    };

    if (typeof el.setDynamicVariables === 'function') {
      try {
        el.setDynamicVariables(vars);
        return;
      } catch {
        /* fall through */
      }
    }
    if (typeof el.updateDynamicVariables === 'function') {
      try {
        el.updateDynamicVariables(vars);
        return;
      } catch {
        /* fall through */
      }
    }

    // Fallback: re-set the attribute. Widget may or may not pick this up
    // mid-conversation depending on version; new conversations will pick it up.
    try {
      el.setAttribute('dynamic-variables', JSON.stringify(vars));
    } catch {
      /* ignore */
    }
  }, [pathname, isLoggedIn, collaboratorCount]);

  // Wait for the resume-id check to settle so the initial render decides
  // whether to set the conversation-id attribute.
  if (!mounted) return null;

  const initialVars = JSON.stringify({
    current_page: pathToPageName(pathname),
    is_logged_in: isLoggedIn ? 'yes' : 'no',
    collaborator_count: String(collaboratorCount),
  });

  return (
    <>
      {/* @ts-expect-error — convai is a custom element not in TS types */}
      <elevenlabs-convai
        ref={widgetRef}
        agent-id={AGENT_ID}
        dynamic-variables={initialVars}
        {...(resumedId ? { 'conversation-id': resumedId } : {})}
      />
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        type="text/javascript"
      />
    </>
  );
}
