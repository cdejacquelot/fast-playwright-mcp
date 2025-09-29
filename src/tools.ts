import type { FullConfig } from './config.js';
import { batchExecuteTool } from './tools/batch-execute.js';
import common from './tools/common.js';
import console from './tools/console.js';
import { browserDiagnose } from './tools/diagnose.js';
import dialogs from './tools/dialogs.js';
import evaluate from './tools/evaluate.js';
import files from './tools/files.js';
import { browserFindElements } from './tools/find-elements.js';
import inspectHtml from './tools/inspect-html.js';
import install from './tools/install.js';
import keyboard from './tools/keyboard.js';
import mouse from './tools/mouse.js';
import navigate from './tools/navigate.js';
import network from './tools/network.js';
import pdf from './tools/pdf.js';
import screenshot from './tools/screenshot.js';
import snapshot from './tools/snapshot.js';
import tabs from './tools/tabs.js';
import type { AnyTool } from './tools/tool.js';
import wait from './tools/wait.js';

// Minimal essential tools only
const essentialTools: AnyTool[] = [
  common[0], // browser_close
  ...navigate, // browser_navigate, navigate_back, navigate_forward
  ...mouse.filter(
    (t) =>
      t.schema.name === 'browser_click' ||
      t.schema.name === 'browser_hover' ||
      t.schema.name === 'browser_select_option'
  ),
  ...keyboard.filter(
    (t) =>
      t.schema.name === 'browser_type' || t.schema.name === 'browser_press_key'
  ),
  ...evaluate, // browser_evaluate - Execute JavaScript
  ...console, // browser_console_messages - Console messages
  ...network, // browser_network_requests - Network requests
  ...screenshot,
  ...snapshot.filter((t) => t.schema.name === 'browser_snapshot'),
  ...wait,
  batchExecuteTool,
  browserFindElements, // browser_find_elements - Advanced element search
];

export const allTools: AnyTool[] = [
  ...common,
  ...console,
  ...dialogs,
  ...evaluate,
  ...files,
  ...install,
  ...inspectHtml,
  ...keyboard,
  ...navigate,
  ...network,
  ...mouse,
  ...pdf,
  ...screenshot,
  ...snapshot,
  ...tabs,
  ...wait,
  batchExecuteTool,
  browserFindElements,
  browserDiagnose,
];
export function filteredTools(config: FullConfig): AnyTool[] {
  // Use minimal tools if MINIMAL_TOOLS env var is set
  if (process.env.MINIMAL_PLAYWRIGHT_TOOLS === 'true') {
    return essentialTools;
  }

  return allTools.filter(
    (tool) =>
      tool.capability === 'core' ||
      config.capabilities?.includes(tool.capability)
  );
}
