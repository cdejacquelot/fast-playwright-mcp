import { expect, test } from './fixtures';
import { HTML_TEMPLATES, setServerContent } from './test-helpers';

test.skip(({ mcpMode }) => mcpMode, 'MCP mode only');

interface TypeTestCase {
  name: string;
  template: string;
  typeArgs: {
    text: string;
    submit?: boolean;
    slowly?: boolean;
  };
  expectedCode: string | RegExp;
  verifyConsole?: (response: unknown) => void;
}

const typeTestCases: TypeTestCase[] = [
  {
    name: 'browser_type',
    template: HTML_TEMPLATES.KEYPRESS_INPUT,
    typeArgs: { text: 'Hi!', submit: true },
    expectedCode: `await page.getByRole('textbox').fill('Hi!');\nawait page.getByRole('textbox').press('Enter');`,
    verifyConsole: (response) => {
      expect(response).toHaveResponse({
        result: expect.stringContaining('[LOG] Key pressed: Enter , Text: Hi!'),
      });
    },
  },
  {
    name: 'browser_type (slowly)',
    template: HTML_TEMPLATES.KEYDOWN_INPUT,
    typeArgs: { text: 'Hi!', slowly: true },
    expectedCode: `await page.getByRole('textbox').pressSequentially('Hi!');`,
    verifyConsole: (response) => {
      expect(response).toHaveResponse({
        result: expect.stringContaining('[LOG] Key pressed: H Text: '),
      });
      expect(response).toHaveResponse({
        result: expect.stringContaining('[LOG] Key pressed: i Text: H'),
      });
      expect(response).toHaveResponse({
        result: expect.stringContaining('[LOG] Key pressed: ! Text: Hi'),
      });
    },
  },
  {
    name: 'browser_type (no submit)',
    template: HTML_TEMPLATES.INPUT_WITH_CONSOLE,
    typeArgs: { text: 'Hi!' },
    expectedCode: /fill\('Hi!'\)/,
    verifyConsole: (response) => {
      expect(response).toHaveResponse({
        result: expect.stringContaining('[LOG] New value: Hi!'),
      });
    },
  },
];

for (const {
  name,
  template,
  typeArgs,
  expectedCode,
  verifyConsole,
} of typeTestCases) {
  test(name, async ({ client, server }) => {
    setServerContent(server, '/', template);

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    const response = await client.callTool({
      name: 'browser_type',
      arguments: {
        selectors: [{ ref: 'e2' }],
        ...typeArgs,
      },
    });

    if (typeof expectedCode === 'string') {
      expect(response).toHaveResponse({
        code: expectedCode,
        pageState: expect.stringContaining('- textbox'),
      });
    } else {
      expect(response).toHaveResponse({
        code: expect.stringMatching(expectedCode),
        pageState: expect.stringContaining('- textbox'),
      });
    }

    if (verifyConsole) {
      const consoleResponse = await client.callTool({
        name: 'browser_console_messages',
      });
      verifyConsole(consoleResponse);
    }
  });
}
