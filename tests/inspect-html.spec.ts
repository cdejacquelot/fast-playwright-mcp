import { expect, test } from './fixtures.js';

interface InspectTestCase {
  name: string;
  html: string;
  arguments: {
    selectors: Array<{ css: string }>;
    depth?: number;
  };
  expectations: Array<{
    type: 'contains' | 'response';
    value: string | object;
  }>;
}

test.describe('browser_inspect_html', () => {
  const testCases: InspectTestCase[] = [
    {
      name: 'basic HTML inspection',
      html: `
        <title>Test Page</title>
        <div id="main-container">
          <h1>Main Heading</h1>
          <p>Test paragraph</p>
        </div>
      `,
      arguments: {
        selectors: [{ css: '#main-container' }],
      },
      expectations: [
        {
          type: 'response',
          value: {
            code: expect.stringContaining('// HTML inspection completed'),
          },
        },
        { type: 'contains', value: 'main-container' },
        { type: 'contains', value: 'elements found: 1' },
      ],
    },
    {
      name: 'multiple selectors',
      html: `
        <title>Test Page</title>
        <h1 id="heading">Main Heading</h1>
        <div id="content">Content div</div>
      `,
      arguments: {
        selectors: [{ css: '#heading' }, { css: '#content' }],
      },
      expectations: [
        { type: 'contains', value: 'elements found: 2' },
        { type: 'contains', value: 'Main Heading' },
        { type: 'contains', value: 'Content div' },
      ],
    },
    {
      name: 'depth control',
      html: `
        <title>Test Page</title>
        <div id="container">
          <div class="nested">
            <p>Nested content</p>
          </div>
        </div>
      `,
      arguments: {
        selectors: [{ css: '#container' }],
        depth: 3,
      },
      expectations: [
        { type: 'contains', value: 'depth: 3' },
        { type: 'contains', value: 'Nested content' },
      ],
    },
  ];

  for (const testCase of testCases) {
    test(testCase.name, async ({ client, server }) => {
      server.setContent('/', testCase.html, 'text/html');

      await client.callTool({
        name: 'browser_navigate',
        arguments: { url: server.PREFIX },
      });

      const result = await client.callTool({
        name: 'browser_inspect_html',
        arguments: testCase.arguments,
      });

      for (const expectation of testCase.expectations) {
        if (expectation.type === 'response') {
          expect(result).toHaveResponse(expectation.value);
        } else if (expectation.type === 'contains') {
          expect(result.content?.[0]?.text).toContain(expectation.value);
        }
      }
    });
  }
});
