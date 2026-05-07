'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CANVAS_TOOLS, executeSquishyTool } from '@/lib/squishy-tools';
import type { CanvasResult } from '@/lib/canvas-bus';

const VALID_NAV_PATHS = new Set(['/', '/signup', '/login', '/dashboard', '/account']);
const CANVAS_TOOL_SET = new Set<string>(CANVAS_TOOLS);

type ToolEventDetail = {
  name?: string;
  tool_name?: string;
  toolName?: string;
  parameters?: Record<string, unknown>;
  parameters_json?: Record<string, unknown>;
  parametersJson?: string;
  // ElevenLabs widget exposes a callback under one of these names depending
  // on version. We feature-detect; if none is present we fall back to a
  // result event the widget polls.
  respond?: (result: unknown) => void;
  reply?: (result: unknown) => void;
  resolve?: (result: unknown) => void;
  callback?: (result: unknown) => void;
  // Sometimes the widget passes a tool_call_id we should echo back.
  tool_call_id?: string;
  toolCallId?: string;
  id?: string;
};

const RESULT_EVENT_NAMES = [
  'elevenlabs-convai:tool-result',
  'elevenlabs-convai:client-tool-result',
  'convai-tool-result',
];

function reportResult(detail: ToolEventDetail, result: unknown) {
  const callback = detail.respond || detail.reply || detail.resolve || detail.callback;
  if (typeof callback === 'function') {
    try {
      callback(result);
      return;
    } catch {
      /* fall through to event dispatch */
    }
  }
  // Fallback: dispatch result events the widget can listen for.
  const id = detail.tool_call_id || detail.toolCallId || detail.id;
  for (const name of RESULT_EVENT_NAMES) {
    try {
      window.dispatchEvent(
        new CustomEvent(name, { detail: { tool_call_id: id, result } }),
      );
    } catch {
      /* ignore */
    }
  }
}

function parseParams(detail: ToolEventDetail): Record<string, unknown> {
  if (detail.parameters && typeof detail.parameters === 'object') return detail.parameters;
  if (detail.parameters_json && typeof detail.parameters_json === 'object')
    return detail.parameters_json as Record<string, unknown>;
  if (typeof detail.parametersJson === 'string') {
    try {
      return JSON.parse(detail.parametersJson);
    } catch {
      return {};
    }
  }
  return {};
}

export default function SquishyToolBridge() {
  const router = useRouter();

  useEffect(() => {
    async function handler(e: Event) {
      const detail = ((e as CustomEvent).detail || {}) as ToolEventDetail;
      const name = detail.name || detail.tool_name || detail.toolName || '';
      const params = parseParams(detail);

      // Navigation tool — built-in, doesn't need the canvas.
      if (name === 'navigate') {
        const path = typeof params.path === 'string' ? params.path : '';
        if (path.startsWith('/') && VALID_NAV_PATHS.has(path)) {
          router.push(path);
          reportResult(detail, { success: true });
        } else {
          reportResult(detail, { success: false, error: `Invalid path: ${path}` });
        }
        return;
      }

      // Canvas tools — dispatched onto the bus, the editor handles them.
      if (CANVAS_TOOL_SET.has(name)) {
        const result: CanvasResult = await executeSquishyTool(name, params);
        reportResult(detail, result);
        return;
      }
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
