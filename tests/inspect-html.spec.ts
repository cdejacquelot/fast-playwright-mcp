import { expect, test } from './fixtures.js';

test.describe('browser_inspect_html', () => {
  test('basic HTML inspection', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Test Page</title>
      <div id="main-container">
        <h1>Main Heading</h1>
        <p>Test paragraph</p>
      </div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: '#main-container' }],
      },
    });

    expect(result).toHaveResponse({
      code: expect.stringContaining('// HTML inspection completed'),
    });

    expect(result.content?.[0]?.text).toContain('main-container');
    expect(result.content?.[0]?.text).toContain('elements found: 1');
  });

  test('multiple selectors', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Test Page</title>
      <h1 id="heading">Main Heading</h1>
      <div id="content">Content div</div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: '#heading' }, { css: '#content' }],
      },
    });

    expect(result.content?.[0]?.text).toContain('elements found: 2');
    expect(result.content?.[0]?.text).toContain('Main Heading');
    expect(result.content?.[0]?.text).toContain('Content div');
  });

  test('depth control', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Test Page</title>
      <div id="container">
        <div class="nested">
          <p>Nested content</p>
        </div>
      </div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: '#container' }],
        depth: 3,
      },
    });

    expect(result.content?.[0]?.text).toContain('depth: 3');
    expect(result.content?.[0]?.text).toContain('Nested content');
  });
});
