import { z } from 'zod';
import { expectationSchema } from '../schemas/expectation.js';
import { formatObject } from '../utils/codegen.js';
import { defineTabTool, defineTool } from './tool.js';
import { generateLocator } from './utils.js';

const snapshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_snapshot',
    title: 'Page snapshot',
    description: 'Capture accessibility snapshot of current page',
    inputSchema: z.object({
      expectation: expectationSchema.describe('Page state config'),
    }),
    type: 'readOnly',
  },
  handle: async (context, params, response) => {
    await context.ensureTab();
    // Always include snapshot for browser_snapshot tool
    response.setIncludeSnapshot();
    // If expectation has snapshotOptions, we need to make sure they are used
    // This is a workaround for the issue where expectation is not properly handled
    if (params.expectation?.snapshotOptions) {
      const tab = context.currentTabOrDie();
      const options = params.expectation.snapshotOptions;
      // Manually capture partial snapshot and store it
      const tabSnapshot = await tab.capturePartialSnapshot(
        options.selector,
        options.maxLength
      );
      // Store the snapshot in response for later use
      response.setTabSnapshot(tabSnapshot);
    }
  },
});

// Element schema for tools that require element interaction
export const elementSchema = z.object({
  element: z
    .string()
    .describe(
      'Human-readable element description used to obtain permission to interact with the element'
    ),
  ref: z
    .string()
    .describe(
      'System-generated element ID from previous tool results. Never use custom values.'
    ),
});

const clickSchema = elementSchema.extend({
  doubleClick: z.boolean().optional().describe('Double-click if true'),
  button: z
    .enum(['left', 'right', 'middle'])
    .optional()
    .describe('Mouse button (default: left)'),
  expectation: expectationSchema.describe(
    'Page state capture config. Use batch_execute for multi-clicks'
  ),
});
const click = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_click',
    title: 'Perform click on web page',
    description: 'Perform click on web page',
    inputSchema: clickSchema,
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);
    const button = params.button;
    const buttonAttr = button ? `{ button: '${button}' }` : '';
    if (params.doubleClick) {
      response.addCode(
        `await page.${await generateLocator(locator)}.dblclick(${buttonAttr});`
      );
    } else {
      response.addCode(
        `await page.${await generateLocator(locator)}.click(${buttonAttr});`
      );
    }
    await tab.waitForCompletion(async () => {
      if (params.doubleClick) {
        await locator.dblclick({ button });
      } else {
        await locator.click({ button });
      }
    });
    // If expectation includes snapshot, capture it now after potential navigation
    if (params.expectation?.includeSnapshot) {
      const newSnapshot = await tab.captureSnapshot();
      response.setTabSnapshot(newSnapshot);
    }
  },
});
const drag = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_drag',
    title: 'Drag mouse',
    description: 'Perform drag and drop between two elements',
    inputSchema: z.object({
      startElement: z
        .string()
        .describe(
          'Human-readable source element description used to obtain the permission to interact with the element'
        ),
      startRef: z
        .string()
        .describe(
          'System-generated source element ID from previous tool results. Never use custom values.'
        ),
      endElement: z
        .string()
        .describe(
          'Human-readable target element description used to obtain the permission to interact with the element'
        ),
      endRef: z
        .string()
        .describe(
          'System-generated target element ID from previous tool results. Never use custom values.'
        ),
      expectation: expectationSchema.describe(
        'Page state after drag. Use batch_execute for workflows'
      ),
    }),
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    const [startLocator, endLocator] = await tab.refLocators([
      { ref: params.startRef, element: params.startElement },
      { ref: params.endRef, element: params.endElement },
    ]);
    await tab.waitForCompletion(async () => {
      await startLocator.dragTo(endLocator);
    });
    response.addCode(
      `await page.${await generateLocator(startLocator)}.dragTo(page.${await generateLocator(endLocator)});`
    );
  },
});
const hover = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_hover',
    title: 'Hover mouse',
    description: 'Hover over element on page',
    inputSchema: elementSchema.extend({
      expectation: expectationSchema.describe(
        'Page state after hover. Use batch_execute for hover→click'
      ),
    }),
    type: 'readOnly',
  },
  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);
    response.addCode(`await page.${await generateLocator(locator)}.hover();`);
    await tab.waitForCompletion(async () => {
      await locator.hover();
    });
  },
});
const selectOptionSchema = elementSchema.extend({
  values: z.array(z.string()).describe('Values to select (array)'),
  expectation: expectationSchema.describe(
    'Page state after selection. Use batch_execute for forms'
  ),
});
const selectOption = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_select_option',
    title: 'Select option',
    description: 'Select option in dropdown',
    inputSchema: selectOptionSchema,
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);
    response.addCode(
      `await page.${await generateLocator(locator)}.selectOption(${formatObject(params.values)});`
    );
    await tab.waitForCompletion(async () => {
      await locator.selectOption(params.values);
    });
  },
});
export default [snapshot, click, drag, hover, selectOption];
