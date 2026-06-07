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
  'open_detail_view',
  'close_detail_view',
  'switch_theme',
  'list_templates',
  'apply_template',
  'switch_view',
  // Wave 1/2 — voice can now drive these too (register matching tools on the
  // ElevenLabs dashboard; see docs/squishy-agent-config.md).
  'toggle_done',
  'toggle_focus_mode',
  'present',
  'summarize_map',
  'find_gaps',
  'make_plan',
  'version_history',
  'session_timer',
  'reactions',
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
      // ElevenLabs tool parameters can't nest objects, so the agent sends a
      // flat `labels: string[]`. The internal CanvasCommand still uses
      // children: { label, note?, color_idx? }[] — we just no longer accept
      // note or color_idx from the tool input.
      const parent_id = asString(params.parent_id);
      const labelsIn = params.labels;
      if (!parent_id || !Array.isArray(labelsIn)) {
        return {
          success: false,
          error: 'create_nodes_batch requires parent_id and labels array',
        };
      }
      const children = labelsIn
        .map((l) => String(l).trim())
        .filter((l) => l.length > 0)
        .map((label) => ({ label }));
      if (children.length === 0) {
        return {
          success: false,
          error: 'create_nodes_batch needs at least one non-empty label',
        };
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

    case 'open_detail_view': {
      const node_id = asString(params.node_id);
      if (!node_id) return { success: false, error: 'open_detail_view requires node_id' };
      command = { type: 'open_detail_view', node_id };
      break;
    }

    case 'close_detail_view':
      command = { type: 'close_detail_view' };
      break;

    case 'switch_theme': {
      const theme = asString(params.theme)?.toLowerCase();
      const valid = ['aurora', 'sunrise', 'forest', 'mono', 'nebula', 'ember'] as const;
      if (!theme || !(valid as readonly string[]).includes(theme)) {
        return {
          success: false,
          error: `switch_theme requires theme to be one of: ${valid.join(', ')}`,
        };
      }
      command = { type: 'switch_theme', theme: theme as (typeof valid)[number] };
      break;
    }

    case 'list_templates':
      command = { type: 'list_templates' };
      break;

    case 'apply_template': {
      const template_id = asString(params.template_id);
      if (!template_id) {
        return { success: false, error: 'apply_template requires template_id' };
      }
      command = { type: 'apply_template', template_id };
      break;
    }

    case 'switch_view': {
      const mode = asString(params.mode)?.toLowerCase();
      const valid = ['canvas', 'tree', 'outline', 'table'] as const;
      if (!mode || !(valid as readonly string[]).includes(mode)) {
        return {
          success: false,
          error: `switch_view requires mode to be one of: ${valid.join(', ')}`,
        };
      }
      command = { type: 'switch_view', mode: mode as (typeof valid)[number] };
      break;
    }

    case 'toggle_done':
      command = { type: 'toggle_done', node_id: asString(params.node_id) };
      break;

    case 'toggle_focus_mode':
      command = { type: 'toggle_focus_mode' };
      break;

    case 'present':
      command = { type: 'present' };
      break;

    case 'summarize_map':
      command = { type: 'ai_assist', action: 'summarize' };
      break;

    case 'find_gaps':
      command = { type: 'ai_assist', action: 'gaps' };
      break;

    case 'make_plan':
      command = { type: 'ai_assist', action: 'plan' };
      break;

    case 'version_history':
      command = { type: 'open_versions' };
      break;

    case 'session_timer':
      command = { type: 'toggle_timer' };
      break;

    case 'reactions':
      command = { type: 'toggle_reactions' };
      break;

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }

  return dispatchCanvasCommand(command);
}
