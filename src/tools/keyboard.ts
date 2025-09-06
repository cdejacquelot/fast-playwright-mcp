import { z } from 'zod';
import { expectationSchema } from '../schemas/expectation.js';
import { elementSelectorSchema } from '../types/selectors.js';
import { quote } from '../utils/codegen.js';
import { generateKeyPressCode } from '../utils/common-formatters.js';
import { defineTabTool } from './tool.js';
import { generateLocator } from './utils.js';

const pressKey = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_press_key',
    title: 'Press a key',
    description: 'Press a key on the keyboard',
    inputSchema: z.object({
      key: z.string().describe('Key to press'),
      expectation: expectationSchema.describe(
        'Page state config. Use batch_execute for multiple keys'
      ),
    }),
    type: 'destructive',
  },
  handle: async (tab, params, response) => {
    response.addCode(`// Press ${params.key}`);
    response.addCode(generateKeyPressCode(params.key));
    await tab.waitForCompletion(async () => {
      await tab.page.keyboard.press(params.key);
    });
    // If expectation includes snapshot, capture it now after navigation
    if (params.expectation?.includeSnapshot) {
      const newSnapshot = await tab.captureSnapshot();
      response.setTabSnapshot(newSnapshot);
    }
  },
});
// Enhanced selector schema for browser tools
const selectorsSchema = z
  .array(elementSelectorSchema)
  .min(1)
  .max(5)
  .describe(
    'Array of element selectors (max 5) supporting ref, role, CSS, or text-based selection'
  );

const typeSchema = z.object({
  selectors: selectorsSchema,
  text: z.string().describe('Text to type into the element'),
  submit: z.boolean().optional().describe('Press Enter after typing if true'),
  slowly: z
    .boolean()
    .optional()
    .describe('Type slowly for auto-complete if true'),
  expectation: expectationSchema.describe(
    'Page state config. Use batch_execute for forms'
  ),
});
const type = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_type',
    title: 'Type text',
    description: 'Type text into editable element',
    inputSchema: typeSchema,
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

    await tab.waitForCompletion(async () => {
      if (params.slowly) {
        response.addCode(
          `await page.${await generateLocator(locator)}.pressSequentially(${quote(params.text)});`
        );
        await locator.pressSequentially(params.text);
      } else {
        response.addCode(
          `await page.${await generateLocator(locator)}.fill(${quote(params.text)});`
        );
        await locator.fill(params.text);
      }

      if (params.submit) {
        response.addCode(
          `await page.${await generateLocator(locator)}.press('Enter');`
        );
        await locator.press('Enter');
      }
    });

    if (params.expectation?.includeSnapshot) {
      const newSnapshot = await tab.captureSnapshot();
      response.setTabSnapshot(newSnapshot);
    }
  },
});
export default [pressKey, type];
