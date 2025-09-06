import { expect, test } from './fixtures.js';

// Regex patterns for extracting refs from snapshots
const BUTTON_REF_PATTERN = /button.*\[ref=(e\d+)\]/;

test.describe('Selector Migration Tests', () => {
  test('browser_click with new selectors array format', async ({
    client,
    server,
  }) => {
    server.setContent(
      '/',
      `
      <title>Click Test</title>
      <button id="btn1">Button 1</button>
      <button role="button">Button 2</button>
      <button>Button 3</button>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test CSS selector
    const cssResult = await client.callTool({
      name: 'browser_click',
      arguments: {
        selectors: [{ css: '#btn1' }],
      },
    });
    expect(cssResult.content?.[0]?.text).toContain('Page state');

    // Test role selector - should fail with multiple matches
    const roleResult = await client.callTool({
      name: 'browser_click',
      arguments: {
        selectors: [{ role: 'button' }],
      },
    });
    expect(roleResult.content?.[0]?.text).toContain('Multiple elements');
    expect(roleResult.content?.[0]?.text).toContain('found with role "button"');

    // Test text selector
    const textResult = await client.callTool({
      name: 'browser_click',
      arguments: {
        selectors: [{ text: 'Button 3' }],
      },
    });
    expect(textResult.content?.[0]?.text).toContain('Page state');
  });

  test('browser_type with new selectors array format', async ({
    client,
    server,
  }) => {
    server.setContent(
      '/',
      `
      <title>Type Test</title>
      <input type="text" id="input1" />
      <input type="text" role="textbox" />
      <input type="text" placeholder="Enter name" />
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test CSS selector
    await client.callTool({
      name: 'browser_type',
      arguments: {
        selectors: [{ css: '#input1' }],
        text: 'test1',
      },
    });

    // Test role selector - should fail with multiple matches
    const roleTypeResult = await client.callTool({
      name: 'browser_type',
      arguments: {
        selectors: [{ role: 'textbox' }],
        text: 'test2',
      },
    });
    expect(roleTypeResult.content?.[0]?.text).toContain('Multiple elements');
    expect(roleTypeResult.content?.[0]?.text).toContain(
      'found with role "textbox"'
    );

    // Test text selector (placeholder text)
    await client.callTool({
      name: 'browser_type',
      arguments: {
        selectors: [{ text: 'Enter name' }],
        text: 'test3',
      },
    });

    // Verify only the first input was filled (CSS selector)
    const snapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    expect(snapshot.content?.[0]?.text).toContain('test1');
    // test2 should not be present as role selector failed with multiple matches
    expect(snapshot.content?.[0]?.text).not.toContain('test2');
  });

  test('browser_hover with new selectors array format', async ({
    client,
    server,
  }) => {
    server.setContent(
      '/',
      `
      <title>Hover Test</title>
      <style>
        .hover-target:hover { background: red; }
      </style>
      <div id="div1" class="hover-target">Hover me 1</div>
      <div role="button" class="hover-target">Hover me 2</div>
      <div class="hover-target">Hover me 3</div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test CSS selector
    await client.callTool({
      name: 'browser_hover',
      arguments: {
        selectors: [{ css: '#div1' }],
      },
    });

    // Test role selector
    await client.callTool({
      name: 'browser_hover',
      arguments: {
        selectors: [{ role: 'button' }],
      },
    });

    // Test text selector
    await client.callTool({
      name: 'browser_hover',
      arguments: {
        selectors: [{ text: 'Hover me 3' }],
      },
    });
  });

  test('browser_select_option with new selectors array format', async ({
    client,
    server,
  }) => {
    server.setContent(
      '/',
      `
      <title>Select Test</title>
      <select id="select1">
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </select>
      <select role="listbox">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </select>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test CSS selector
    await client.callTool({
      name: 'browser_select_option',
      arguments: {
        selectors: [{ css: '#select1' }],
        values: ['2'],
      },
    });

    // Test role selector
    await client.callTool({
      name: 'browser_select_option',
      arguments: {
        selectors: [{ role: 'listbox' }],
        values: ['b'],
      },
    });
  });

  test('browser_drag with new selectors array format', async ({
    client,
    server,
  }) => {
    server.setContent(
      '/',
      `
      <title>Drag Test</title>
      <div id="source" draggable="true">Drag me</div>
      <div id="target">Drop here</div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test CSS selectors
    await client.callTool({
      name: 'browser_drag',
      arguments: {
        startSelectors: [{ css: '#source' }],
        endSelectors: [{ css: '#target' }],
      },
    });
  });

  test('selector fallback and priority', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Priority Test</title>
      <button id="btn1">Click Me</button>
      <input type="text" id="input1" />
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Get snapshot to get ref
    const snapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    const refMatch = snapshot.content?.[0]?.text?.match(BUTTON_REF_PATTERN);
    const ref = refMatch?.[1];

    if (ref) {
      // Test with multiple selectors - ref should win
      await client.callTool({
        name: 'browser_click',
        arguments: {
          selectors: [
            { ref }, // Should be used first
            { css: '#btn1' },
            { text: 'Click Me' },
          ],
        },
      });
    }

    // Test fallback when first selector fails
    await client.callTool({
      name: 'browser_type',
      arguments: {
        selectors: [
          { css: '#nonexistent' }, // Will fail
          { css: '#input1' }, // Should be used as fallback
        ],
        text: 'fallback worked',
      },
    });

    const finalSnapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    expect(finalSnapshot.content?.[0]?.text).toContain('fallback worked');
  });

  test('parallel selector resolution strategy', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Parallel Resolution Test</title>
      <div class="item">Item 1</div>
      <div class="item">Item 2</div>
      <div class="item">Item 3</div>
      <div class="item">Item 4</div>
      <div class="item">Item 5</div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test multiple CSS selectors resolved in parallel
    const result = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [
          { css: '.item:nth-child(1)' },
          { css: '.item:nth-child(2)' },
          { css: '.item:nth-child(3)' },
          { css: '.item:nth-child(4)' },
          { css: '.item:nth-child(5)' },
        ],
        depth: 1,
      },
    });

    expect(result.content?.[0]?.text).toContain('elements found: 5');
    expect(result.content?.[0]?.text).toContain('Item 1');
    expect(result.content?.[0]?.text).toContain('Item 5');
  });

  test('ref selector display format', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Ref Display Test</title>
      <button>Test Button</button>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Get ref from snapshot
    const snapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });

    const refMatch = snapshot.content?.[0]?.text?.match(BUTTON_REF_PATTERN);
    const ref = refMatch?.[1];

    if (ref) {
      const result = await client.callTool({
        name: 'browser_inspect_html',
        arguments: {
          selectors: [{ ref }],
        },
      });

      // Should display "ref=eX" not "unknown"
      expect(result.content?.[0]?.text).toContain(`ref=${ref}`);
      expect(result.content?.[0]?.text).not.toContain('unknown');
    }
  });

  test('error handling for invalid selectors', async ({ client, server }) => {
    server.setContent(
      '/',
      '<title>Error Test</title><div>Content</div>',
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test with non-existent selectors
    const result = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [
          { css: '#nonexistent' },
          { role: 'nonexistent' },
          { text: 'nonexistent' },
        ],
      },
    });

    expect(result.content?.[0]?.text).toContain('elements found: 0');
    expect(result.content?.[0]?.text).toContain('selectors not found: 3');
  });
});
