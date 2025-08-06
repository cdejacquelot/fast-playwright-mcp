/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import { defineTabTool, defineTool } from './tool.js';
import * as javascript from '../javascript.js';
import { generateLocator } from './utils.js';
import { expectationSchema } from '../schemas/expectation.js';

const snapshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_snapshot',
    title: 'Page snapshot',
    description: `Capture accessibility snapshot of current page.AVOID calling directly - use expectation:{includeSnapshot:true} on other tools instead.USE CASES:Initial page inspection,debugging when other tools didn't capture needed info.snapshotOptions:{selector:"#content"} to focus on specific area.`,
    inputSchema: z.object({
      expectation: expectationSchema
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
      const snapshot = await tab.capturePartialSnapshot(
          options.selector,
          options.maxLength
      );

      // Store the snapshot in response for later use
      (response as any)._tabSnapshot = snapshot;
    }
  },
});

export const elementSchema = z.object({
  element: z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
  ref: z.string().describe('Exact target element reference from the page snapshot'),
});

const clickSchema = elementSchema.extend({
  doubleClick: z.boolean().optional().describe('Whether to perform a double click instead of a single click'),
  button: z.enum(['left', 'right', 'middle']).optional().describe('Button to click, defaults to left'),
  expectation: expectationSchema
});

const click = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_click',
    title: 'Click',
    description: `Perform click on web page.USE batch_execute for multi-click workflows.expectation:{includeSnapshot:false} when next action follows immediately,true to verify result.diffOptions:{enabled:true,format:"minimal"} shows only changes(saves 80% tokens).snapshotOptions:{selector:".result"} to focus on result area.doubleClick:true for double-click,button:"right" for context menu.`,
    inputSchema: clickSchema,
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);
    const button = params.button;
    const buttonAttr = button ? `{ button: '${button}' }` : '';

    if (params.doubleClick)
      response.addCode(`await page.${await generateLocator(locator)}.dblclick(${buttonAttr});`);
    else
      response.addCode(`await page.${await generateLocator(locator)}.click(${buttonAttr});`);

    await tab.waitForCompletion(async () => {
      if (params.doubleClick)
        await locator.dblclick({ button });
      else
        await locator.click({ button });
    });
  },
});

const drag = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_drag',
    title: 'Drag mouse',
    description: `Perform drag and drop between two elements.expectation:{includeSnapshot:true,snapshotOptions:{selector:".drop-zone"}} to verify drop result.diffOptions:{enabled:true} shows only what moved.CONSIDER batch_execute if part of larger workflow.`,
    inputSchema: z.object({
      startElement: z.string().describe('Human-readable source element description used to obtain the permission to interact with the element'),
      startRef: z.string().describe('Exact source element reference from the page snapshot'),
      endElement: z.string().describe('Human-readable target element description used to obtain the permission to interact with the element'),
      endRef: z.string().describe('Exact target element reference from the page snapshot'),
      expectation: expectationSchema
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

    response.addCode(`await page.${await generateLocator(startLocator)}.dragTo(page.${await generateLocator(endLocator)});`);
  },
});

const hover = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_hover',
    title: 'Hover mouse',
    description: `Hover over element on page.expectation:{includeSnapshot:true} to capture tooltips/dropdown menus,false for simple hover.snapshotOptions:{selector:".tooltip"} to focus on tooltip area.Often followed by click - use batch_execute for hover→click sequences.`,
    inputSchema: elementSchema.extend({
      expectation: expectationSchema
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
  values: z.array(z.string()).describe('Array of values to select in the dropdown. This can be a single value or multiple values.'),
  expectation: expectationSchema
});

const selectOption = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_select_option',
    title: 'Select option',
    description: `Select option in dropdown.values:["option1","option2"] for multi-select.expectation:{includeSnapshot:false} when part of form filling(use batch),true to verify selection.snapshotOptions:{selector:"form"} for form context.USE batch_execute for form workflows with multiple selects.`,
    inputSchema: selectOptionSchema,
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);
    response.addCode(`await page.${await generateLocator(locator)}.selectOption(${javascript.formatObject(params.values)});`);

    await tab.waitForCompletion(async () => {
      await locator.selectOption(params.values);
    });
  },
});

export default [
  snapshot,
  click,
  drag,
  hover,
  selectOption,
];
