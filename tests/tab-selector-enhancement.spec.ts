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

test.describe('Tab Selector Enhancement Integration', () => {
  // Basic integration test to verify enhanced Tab functionality builds correctly

  test('should build and initialize enhanced Tab without errors', async ({
    client,
    server,
  }) => {
    // Test that verifies the enhanced Tab class loads correctly
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.HELLO_WORLD },
    });

    const response = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    // If we get here, the enhanced Tab class initialized successfully
    expect(response).toHaveProperty('content');
    expect(response.content).toBeDefined();
  });
});
