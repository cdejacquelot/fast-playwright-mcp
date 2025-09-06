import { z } from 'zod';
import { expectationSchema } from '../schemas/expectation.js';
import { elementSelectorSchema } from '../types/selectors.js';
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

// Enhanced selector schema for browser tools using the unified selector system
export const selectorsSchema = z
  .array(elementSelectorSchema)
  .min(1)
  .max(5)
  .describe(
    'Array of element selectors (max 5). Selectors are tried in order until one succeeds (fallback mechanism). ' +
      'Multiple matches trigger an error with candidate list. ' +
      'Supports: ref (highest priority), CSS (#id, .class, tag), role (button, textbox, etc.), text content. ' +
      'Example: [{css: "#submit"}, {role: "button", text: "Submit"}] - tries ID first, falls back to role+text'
  );

const clickSchema = z.object({
  selectors: selectorsSchema,
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
    const resolutionResults = await tab.resolveElementLocators(
      params.selectors
    );
    const successfulResults = resolutionResults.filter(
      (r) => r.locator && !r.error
    );

    if (successfulResults.length === 0) {
      const errors = resolutionResults
        .map((r) => r.error || 'Unknown error')
        .join(', ');
      throw new Error(`Failed to resolve any element selectors: ${errors}`);
    }

    // Use the first successfully resolved locator
    const { locator } = successfulResults[0];
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
      startSelectors: selectorsSchema.describe(
        'Source element selectors for drag start'
      ),
      endSelectors: selectorsSchema.describe(
        'Target element selectors for drag end'
      ),
      expectation: expectationSchema.describe(
        'Page state after drag. Use batch_execute for workflows'
      ),
    }),
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    const [startResults, endResults] = await Promise.all([
      tab.resolveElementLocators(params.startSelectors),
      tab.resolveElementLocators(params.endSelectors),
    ]);

    const startSuccessful = startResults.filter((r) => r.locator && !r.error);
    const endSuccessful = endResults.filter((r) => r.locator && !r.error);

    if (startSuccessful.length === 0) {
      const errors = startResults
        .map((r) => r.error || 'Unknown error')
        .join(', ');
      throw new Error(`Failed to resolve start element selectors: ${errors}`);
    }

    if (endSuccessful.length === 0) {
      const errors = endResults
        .map((r) => r.error || 'Unknown error')
        .join(', ');
      throw new Error(`Failed to resolve end element selectors: ${errors}`);
    }

    const startLocator = startSuccessful[0].locator;
    const endLocator = endSuccessful[0].locator;

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
    inputSchema: z.object({
      selectors: selectorsSchema,
      expectation: expectationSchema.describe(
        'Page state after hover. Use batch_execute for hover→click'
      ),
    }),
    type: 'readOnly',
  },
  handle: async (tab, params, response) => {
    const resolutionResults = await tab.resolveElementLocators(
      params.selectors
    );
    const successfulResults = resolutionResults.filter(
      (r) => r.locator && !r.error
    );

    if (successfulResults.length === 0) {
      const errors = resolutionResults
        .map((r) => r.error || 'Unknown error')
        .join(', ');
      throw new Error(`Failed to resolve element selectors: ${errors}`);
    }

    const { locator } = successfulResults[0];

    response.addCode(`await page.${await generateLocator(locator)}.hover();`);

    await tab.waitForCompletion(async () => {
      await locator.hover();
    });
  },
});
const selectOptionSchema = z.object({
  selectors: selectorsSchema,
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
    const resolutionResults = await tab.resolveElementLocators(
      params.selectors
    );
    const successfulResults = resolutionResults.filter(
      (r) => r.locator && !r.error
    );

    if (successfulResults.length === 0) {
      const errors = resolutionResults
        .map((r) => r.error || 'Unknown error')
        .join(', ');
      throw new Error(`Failed to resolve element selectors: ${errors}`);
    }

    const { locator } = successfulResults[0];

    response.addCode(
      `await page.${await generateLocator(locator)}.selectOption(${formatObject(params.values)});`
    );

    await tab.waitForCompletion(async () => {
      await locator.selectOption(params.values);
    });
  },
});
export default [snapshot, click, drag, hover, selectOption];
