/**
 * Tool Registry — Centralized tool metadata with workspace visibility.
 * Ported from Chaterm's src/main/agent/core/task/tool-registry.ts
 */

export type TaskWorkspace = 'server' | 'database';
export type ToolCategory = 'server' | 'database' | 'common';

export interface ToolMetadata {
  name: string;
  allowedIn: TaskWorkspace[];
  paramNames: string[];
  category: ToolCategory;
  /** Whether partial JSON (streaming) is acceptable for this tool */
  allowPartial?: boolean;
}

const toolMetadataInternal: ToolMetadata[] = [
  // === Server tools ===
  {
    name: 'execute_command',
    allowedIn: ['server'],
    paramNames: ['command', 'reason'],
    category: 'server',
  },
  {
    name: 'write_to_file',
    allowedIn: ['server'],
    paramNames: ['path', 'content'],
    category: 'server',
  },
  {
    name: 'read_file',
    allowedIn: ['server'],
    paramNames: ['path', 'offset', 'limit'],
    category: 'server',
  },
  {
    name: 'glob_search',
    allowedIn: ['server'],
    paramNames: ['pattern', 'path'],
    category: 'server',
  },
  {
    name: 'grep_search',
    allowedIn: ['server'],
    paramNames: ['pattern', 'path', 'include'],
    category: 'server',
  },

  // === Common tools (server + database) ===
  {
    name: 'todo_write',
    allowedIn: ['server', 'database'],
    paramNames: ['todos'],
    category: 'common',
    allowPartial: true,
  },
  {
    name: 'todo_read',
    allowedIn: ['server', 'database'],
    paramNames: [],
    category: 'common',
  },
  {
    name: 'focus_task',
    allowedIn: ['server', 'database'],
    paramNames: ['taskId'],
    category: 'common',
  },
  {
    name: 'complete_task',
    allowedIn: ['server', 'database'],
    paramNames: ['result'],
    category: 'common',
  },
  {
    name: 'ask_followup_question',
    allowedIn: ['server', 'database'],
    paramNames: ['question', 'options'],
    category: 'common',
  },
  {
    name: 'web_fetch',
    allowedIn: ['server', 'database'],
    paramNames: ['url', 'prompt'],
    category: 'common',
  },
];

// Build lookup map
const toolMetaMap = new Map<string, ToolMetadata>();
for (const meta of toolMetadataInternal) {
  toolMetaMap.set(meta.name, meta);
}

export function getToolMetadata(name: string): ToolMetadata | undefined {
  return toolMetaMap.get(name);
}

export function getAllowedTools(workspace: TaskWorkspace): ToolMetadata[] {
  return toolMetadataInternal.filter((t) => t.allowedIn.includes(workspace));
}

export function isToolAllowed(name: string, workspace: TaskWorkspace): boolean {
  const meta = toolMetaMap.get(name);
  if (!meta) return false;
  return meta.allowedIn.includes(workspace);
}

export const registeredToolNames = toolMetadataInternal.map((t) => t.name);
