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

import { expect, test } from './fixtures.js';
import { HTML_TEMPLATES, setServerContent } from './test-helpers.js';

const hoverTestCases = [
  {
    name: 'browser_hover',
    template: HTML_TEMPLATES.HOVER_BUTTON,
    expectedCode: `await page.getByRole('button', { name: 'Hover me' }).hover();`,
    expectedState: '- button "Hovered!"',
  },
  {
    name: 'browser_hover (tooltip)',
    template: HTML_TEMPLATES.HOVER_TOOLTIP,
    expectedCode: `await page.getByRole('button', { name: 'Hover for tooltip' }).hover();`,
    expectedState: 'tooltip',
  },
];

for (const { name, template, expectedCode, expectedState } of hoverTestCases) {
  test(name, async ({ client, server }) => {
    setServerContent(server, '/', template);

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_hover',
      arguments: {
        selectors: [{ ref: 'e2' }],
      },
    });

    expect(result).toHaveResponse({
      code: expectedCode,
      pageState: expect.stringContaining(expectedState),
    });
  });
}
