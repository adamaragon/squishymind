import {
  dispatchCanvasCommand,
  type CanvasCommand,
  type CanvasResult,
} from './canvas-bus';

export const CANVAS_TOOLS = [
  'create_node',
  'create_nodes_batch',
  'update_node',
  'move_node',
  'delete_node',
  'undo',
  'list_nodes',
  'focus_node',
  'fit_to_screen',
] as const;

type ToolParams = Record<string, unknown>;

function asString(v: unknown): string | undefined {
  return v == null ? undefined : String(v);
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

/**
 * Translate an ElevenLabs widget tool call into a typed canvas command and
 * dispatch it. Returns the canvas's response or an error if validation fails
 * before dispatch.
 */
export async function executeSquishyTool(
  toolName: string,
  params: ToolParams,
): Promise<CanvasResult> {
  let command: CanvasCommand;

  switch (toolName) {
    case 'create_node': {
      const parent_id = asString(params.parent_id);
      const label = asString(params.label);
      if (!parent_id || !label) {
        return { success: false, error: 'create_node requires parent_id and label' };
      }
      command = {
        type: 'create_node',
        parent_id,
        label,
        note: asString(params.note),
        color_idx: asNumber(params.color_idx),
      };
      break;
    }

    case 'create_nodes_batch': {
      const parent_id = asString(params.parent_id);
      const childrenIn = params.children;
      if (!parent_id || !Array.isArray(childrenIn)) {
        return {
          success: false,
          error: 'create_nodes_batch requires parent_id and children array',
        };
      }
      type Child = { label: string; note?: string; color_idx?: number };
      const children: Child[] = [];
      for (const c of childrenIn) {
        if (!c || typeof c !== 'object') continue;
        const child = c as ToolParams;
        const label = asString(child.label);
        if (!label) continue;
        const out: Child = { label };
        const note = asString(child.note);
        if (note !== undefined) out.note = note;
        const color = asNumber(child.color_idx);
        if (color !== undefined) out.color_idx = color;
        children.push(out);
      }
      if (children.length === 0) {
        return { success: false, error: 'create_nodes_batch needs at least one valid child' };
      }
      command = { type: 'create_nodes_batch', parent_id, children };
      break;
    }

    case 'update_node': {
      const node_id = asString(params.node_id);
      if (!node_id) return { success: false, error: 'update_node requires node_id' };
      command = {
        type: 'update_node',
        node_id,
        label: asString(params.label),
        note: asString(params.note),
        color_idx: asNumber(params.color_idx),
      };
      break;
    }

    case 'move_node': {
      const node_id = asString(params.node_id);
      const new_parent_id = asString(params.new_parent_id);
      if (!node_id || !new_parent_id) {
        return {
          success: false,
          error: 'move_node requires node_id and new_parent_id',
        };
      }
      command = { type: 'move_node', node_id, new_parent_id };
      break;
    }

    case 'delete_node': {
      const node_id = asString(params.node_id);
      if (!node_id) return { success: false, error: 'delete_node requires node_id' };
      command = { type: 'delete_node', node_id };
      break;
    }

    case 'undo':
      command = { type: 'undo' };
      break;

    case 'list_nodes':
      command = {
        type: 'list_nodes',
        parent_id: asString(params.parent_id),
        query: asString(params.query),
      };
      break;

    case 'focus_node': {
      const node_id = asString(params.node_id);
      if (!node_id) return { success: false, error: 'focus_node requires node_id' };
      command = { type: 'focus_node', node_id };
      break;
    }

    case 'fit_to_screen':
      command = { type: 'fit_to_screen' };
      break;

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }

  return dispatchCanvasCommand(command);
}
