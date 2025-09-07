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

const waitTestCases = [
  {
    name: 'browser_wait_for(text)',
    template: HTML_TEMPLATES.WAIT_FOR_TEXT_UPDATE,
    needsClick: true,
    waitArgs: { text: 'Text to appear' },
    expectedCode: `await page.getByText("Text to appear").first().waitFor({ state: 'visible' });`,
    expectedState: '- generic [ref=e3]: Text to appear',
  },
  {
    name: 'browser_wait_for(textGone)',
    template: HTML_TEMPLATES.WAIT_FOR_TEXT_UPDATE,
    needsClick: true,
    waitArgs: { textGone: 'Text to disappear' },
    expectedCode: `await page.getByText("Text to disappear").first().waitFor({ state: 'hidden' });`,
    expectedState: '- generic [ref=e3]: Text to appear',
  },
  {
    name: 'browser_wait_for(time)',
    template: '<body><div>Hello World</div></body>',
    needsClick: false,
    waitArgs: { time: 1 },
    expectedCode: 'await new Promise(f => setTimeout(f, 1 * 1000));',
    expectedState: null,
  },
];

for (const {
  name,
  template,
  needsClick,
  waitArgs,
  expectedCode,
  expectedState,
} of waitTestCases) {
  test(name, async ({ client, server, mcpBrowser }) => {
    test.skip(mcpBrowser === 'msedge', 'msedge browser setup issues');
    if (template === '<body><div>Hello World</div></body>') {
      server.setContent('/', template, 'text/html');
    } else {
      setServerContent(server, '/', template);
    }

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    if (needsClick) {
      await client.callTool({
        name: 'browser_click',
        arguments: {
          selectors: [{ ref: 'e2' }],
        },
      });
    }

    const result = await client.callTool({
      name: 'browser_wait_for',
      arguments: waitArgs,
    });

    const expectedResponse: Record<string, unknown> = {
      code: expect.stringContaining(expectedCode),
    };

    if (expectedState) {
      expectedResponse.pageState = expect.stringContaining(expectedState);
    }

    expect(result).toHaveResponse(expectedResponse);
  });
}
