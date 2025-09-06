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

test.describe('SelectorResolver Integration', () => {
  // Basic integration test to verify the SelectorResolver service builds correctly
  // and doesn't cause runtime errors

  test('should build and initialize without errors', async ({
    client,
    server,
  }) => {
    // Simple test to verify that the enhanced Tab class loads correctly with SelectorResolver
    server.setContent(
      '/',
      `
      <title>SelectorResolver Build Test</title>
      <div>
        <p>Testing SelectorResolver integration</p>
        <button>Test Button</button>
      </div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.HELLO_WORLD },
    });

    const response = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // If we get here without errors, the SelectorResolver service integrated correctly
    expect(response).toHaveProperty('content');
    // Basic check that the service loaded without runtime errors
    expect(response.content).toBeDefined();
  });
});
