import { expect, test } from './fixtures';
import { HTML_TEMPLATES, setServerContent } from './test-helpers';

test.skip(({ mcpMode }) => mcpMode, 'MCP mode only');

const clickTestCases = [
  {
    name: 'browser_click',
    setup: () => HTML_TEMPLATES.BASIC_BUTTON,
    clickArgs: {},
    expectedCode: `await page.getByRole('button', { name: 'Submit' }).click();`,
    expectedState: () => `- button "Submit"`,
  },
  {
    name: 'browser_click (double)',
    setup: () =>
      HTML_TEMPLATES.CLICKABLE_HEADING_WITH_SCRIPT(
        'Click me',
        `
      function handle() {
        document.querySelector('h1').textContent = 'Double clicked';
      }
    `
      ),
    clickArgs: { doubleClick: true },
    expectedCode: `await page.getByRole('heading', { name: 'Click me' }).dblclick();`,
    expectedState: () => `- heading "Double clicked" [level=1] [ref=e3]`,
  },
  {
    name: 'browser_click (right)',
    setup: () => HTML_TEMPLATES.CONTEXT_MENU_BUTTON('Menu'),
    clickArgs: { button: 'right' as const },
    expectedCode: `await page.getByRole('button', { name: 'Menu' }).click({ button: 'right' });`,
    expectedState: () => `- button "Right clicked"`,
  },
];

for (const {
  name,
  setup,
  clickArgs,
  expectedCode,
  expectedState,
} of clickTestCases) {
  test(name, async ({ client, server }) => {
    setServerContent(server, '/', setup());

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const result = await client.callTool({
      name: 'browser_click',
      arguments: {
        selectors: [{ ref: 'e2' }],
        ...clickArgs,
      },
    });

    expect(result).toHaveResponse({
      code: expectedCode,
      pageState: expect.stringContaining(expectedState()),
    });
  });
}
