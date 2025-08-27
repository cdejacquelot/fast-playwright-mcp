import { z } from 'zod';
import { expectationSchema } from '../schemas/expectation.js';
import { quote } from '../utils/codegen.js';
import { generateKeyPressCode } from '../utils/common-formatters.js';
import { baseElementSchema as elementSchema } from './base-tool-handler.js';
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
const typeSchema = elementSchema.extend({
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
  text: z.string(),
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
    const locator = await tab.refLocator(params);
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
