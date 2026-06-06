// Typed command bus between Squishy (widget tree) and the canvas (editor tree).
// They live in different React subtrees and communicate via window CustomEvents
// with a correlation ID so dispatchers can match results to their commands.

export type CanvasCommand =
  | {
      type: 'create_node';
      parent_id: string;
      label: string;
      note?: string;
      color_idx?: number;
    }
  | {
      type: 'create_nodes_batch';
      parent_id: string;
      children: Array<{ label: string; note?: string; color_idx?: number }>;
    }
  | {
      type: 'update_node';
      node_id: string;
      label?: string;
      note?: string;
      color_idx?: number;
    }
  | { type: 'move_node'; node_id: string; new_parent_id: string }
  | { type: 'delete_node'; node_id: string }
  | { type: 'undo' }
  | { type: 'list_nodes'; parent_id?: string; query?: string }
  | { type: 'focus_node'; node_id: string }
  | { type: 'fit_to_screen' }
  | { type: 'open_detail_view'; node_id: string }
  | { type: 'close_detail_view' }
  | { type: 'switch_theme'; theme: 'aurora' | 'sunrise' | 'forest' | 'mono' }
  | { type: 'list_templates' }
  | { type: 'apply_template'; template_id: string }
  | { type: 'switch_view'; mode: 'canvas' | 'tree' | 'outline' | 'table' }
  // ---- Wave 1: command-palette / focus / tasks ----
  /** Toggle a node's task-done state. Defaults to the selected node. */
  | { type: 'toggle_done'; node_id?: string }
  /** Toggle Focus (Spotlight) mode — dims everything but the active branch. */
  | { type: 'toggle_focus_mode' }
  /** Export the current map. 'doc' produces a Markdown document. */
  | { type: 'export_map'; format: 'json' | 'png' | 'pdf' | 'doc' }
  /** Open the JSON import file picker. */
  | { type: 'open_import' }
  /** "Smarter Squishy": run an AI pass over the whole map. 'summarize' returns
   *  text; 'gaps' and 'plan' add a labelled branch of suggestions. */
  | { type: 'ai_assist'; action: 'summarize' | 'gaps' | 'plan' }
  /** Enter full-screen Presentation mode (handled at the EditorShell level so
   *  it works from any view). */
  | { type: 'present' };

export type CanvasResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

type DispatchPayload = CanvasCommand & { correlationId: string };
type ResultPayload = { correlationId: string; result: CanvasResult };

const COMMAND_EVENT = 'squishymind:canvas-command';
const RESULT_EVENT = 'squishymind:canvas-result';

/**
 * Send a command to the active canvas. Resolves with the canvas's response
 * (or a timeout error if no canvas handler is mounted, e.g., off the editor
 * page). Default 5s timeout — long enough for a slow render but short enough
 * that Squishy doesn't sound dead.
 */
export function dispatchCanvasCommand(
  cmd: CanvasCommand,
  timeoutMs = 5000,
): Promise<CanvasResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ success: false, error: 'Canvas not available (no window).' });
      return;
    }
    const correlationId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ResultPayload>).detail;
      if (!detail || detail.correlationId !== correlationId) return;
      clearTimeout(timer);
      window.removeEventListener(RESULT_EVENT, handler);
      resolve(detail.result);
    };
    const timer = setTimeout(() => {
      window.removeEventListener(RESULT_EVENT, handler);
      resolve({
        success: false,
        error: 'Canvas did not respond. Are you on the editor page?',
      });
    }, timeoutMs);
    window.addEventListener(RESULT_EVENT, handler);
    window.dispatchEvent(
      new CustomEvent<DispatchPayload>(COMMAND_EVENT, {
        detail: { ...cmd, correlationId },
      }),
    );
  });
}

/**
 * Mount a canvas-side handler that processes incoming commands. Returns an
 * unregister function for cleanup.
 *
 * Multiple handlers can coexist (e.g. the imperative canvas registers one
 * for editing commands while the editor shell registers another for view-
 * mode switching). Each handler may return `undefined` to mean "not my
 * command — let another handler respond." Only handlers that return a
 * concrete CanvasResult emit a result event, so there's no race between
 * a real success and a stale "unknown command type" error.
 */
export function registerCanvasHandler(
  handle: (
    cmd: CanvasCommand,
  ) => Promise<CanvasResult | undefined> | CanvasResult | undefined,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = async (e: Event) => {
    const detail = (e as CustomEvent<DispatchPayload>).detail;
    if (!detail) return;
    const { correlationId, ...rest } = detail;
    const command = rest as CanvasCommand;
    let result: CanvasResult | undefined;
    try {
      result = await handle(command);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result = { success: false, error: msg };
    }
    if (result === undefined) return;
    window.dispatchEvent(
      new CustomEvent<ResultPayload>(RESULT_EVENT, {
        detail: { correlationId, result },
      }),
    );
  };
  window.addEventListener(COMMAND_EVENT, listener);
  return () => window.removeEventListener(COMMAND_EVENT, listener);
}
