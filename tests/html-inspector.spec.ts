import { expect, test } from '@playwright/test';
import type { HTMLInspectionOptions } from '../src/types/html-inspection.js';
import { HTMLInspector } from '../src/utilities/html-inspector.js';

test.describe('HTMLInspector', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a test page with various HTML elements
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <style>
            .hidden { display: none; }
            .highlight { background: yellow; }
          </style>
        </head>
        <body>
          <div id="main-container" class="container">
            <h1 data-testid="main-heading">Main Heading</h1>
            <div class="content-section">
              <p>This is a test paragraph with <strong>bold text</strong>.</p>
              <ul role="list">
                <li>Item 1</li>
                <li>Item 2</li>
                <li>Item 3</li>
              </ul>
            </div>
            <form id="test-form">
              <input type="text" name="username" id="username" placeholder="Enter username" />
              <button type="submit" data-testid="submit-btn">Submit</button>
            </form>
            <div class="hidden">Hidden content</div>
            <script>console.log('test');</script>
          </div>
        </body>
      </html>
    `);
  });

  test('should create HTMLInspector instance', ({ page }) => {
    const inspector = new HTMLInspector(page);
    expect(inspector).toBeDefined();
  });

  test('should extract HTML with default options', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [{ css: '#main-container' }],
    };

    const result = await inspector.extractHTML(options);

    expect(result.elements).toBeDefined();
    expect(result.elements[0]).toBeDefined();
    expect(result.elements[0].html).toContain('main-container');
    expect(result.totalSizeBytes).toBeGreaterThan(0);
    expect(result.totalSizeBytes).toBeLessThan(50_000); // Default 50KB limit
    expect(result.truncated).toBe(false);
  });

  test('should respect depth limitations', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [{ css: '#main-container' }],
      depth: 2,
    };

    const result = await inspector.extractHTML(options);
    const element = result.elements[0];

    // With depth 2, should have children
    expect(element.children).toBeDefined();
    expect(element.children?.length).toBeGreaterThan(0);

    // Should respect the depth limitation
    expect(result.stats.averageDepth).toBeLessThanOrEqual(3);
  });

  test('should handle size limits and truncation', async ({ page }) => {
    const inspector = new HTMLInspector(page);

    // Add more content to the page to ensure truncation occurs
    await page.evaluate(() => {
      const container = document.getElementById('main-container');
      if (container) {
        for (let i = 0; i < 50; i++) {
          const div = document.createElement('div');
          div.innerHTML = `<p>This is additional content ${i} that should make the HTML larger and trigger truncation when we set a small size limit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`;
          container.appendChild(div);
        }
      }
    });

    // Set a small size limit to force truncation
    const options: HTMLInspectionOptions = {
      selectors: [{ css: 'body' }],
      maxSize: 2000, // Small limit that should be exceeded
    };

    const result = await inspector.extractHTML(options);

    expect(result.truncated).toBe(true);
    expect(result.totalSizeBytes).toBeLessThanOrEqual(2000);
    expect(result.suggestions).toContain(
      'Content was truncated. Consider reducing depth or using more specific selectors.'
    );
  });

  test('should exclude elements based on selector', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [{ css: 'body' }],
      excludeSelector: '.hidden',
    };

    const result = await inspector.extractHTML(options);

    expect(result.elements[0].html).not.toContain('Hidden content');
  });

  test('should include or exclude scripts based on options', async ({
    page,
  }) => {
    const inspector = new HTMLInspector(page);

    // Test excluding scripts (default behavior)
    const optionsWithoutScripts: HTMLInspectionOptions = {
      selectors: [{ css: 'body' }],
    };

    const resultWithoutScripts = await inspector.extractHTML(
      optionsWithoutScripts
    );
    expect(resultWithoutScripts.elements[0].html).not.toContain('<script>');
  });

  test('should extract element metadata correctly', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [{ css: '#main-container' }],
      includeAttributes: true,
    };

    const result = await inspector.extractHTML(options);
    const element = result.elements[0];

    expect(element.metadata.tagName).toBe('div');
    expect(element.metadata.attributes.id).toBe('main-container');
    expect(element.metadata.attributes.class).toBe('container');
    expect(element.metadata.textContent).toContain('Main Heading');
    expect(element.metadata.sizeBytes).toBeGreaterThan(0);
  });

  test('should generate CSS selector suggestions', async ({ page }) => {
    const inspector = new HTMLInspector(page);

    // First extract some HTML to analyze
    const options: HTMLInspectionOptions = {
      selectors: [
        { css: '#main-container' },
        { css: '[data-testid="main-heading"]' },
        { css: '#username' },
      ],
      depth: 2,
    };

    const extractResult = await inspector.extractHTML(options);
    const suggestions = await inspector.suggestCSSSelectors(extractResult);

    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThanOrEqual(0);

    // If we have suggestions, they should include ID-based selectors
    if (suggestions.length > 0) {
      const hasIdSelector = suggestions.some((s) => s.selector.startsWith('#'));
      const hasDataTestIdSelector = suggestions.some((s) =>
        s.selector.includes('data-testid')
      );

      expect(hasIdSelector || hasDataTestIdSelector).toBe(true);
    }
  });

  test('should optimize content for LLM consumption', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [{ css: 'body' }],
      format: 'html',
    };

    const result = await inspector.extractHTML(options);
    const optimized = await inspector.optimizeForLLM(result);

    expect(optimized.elements[0].html).toBeDefined();

    // Should have clean, readable HTML
    const html = optimized.elements[0].html;
    expect(html).not.toContain('<script>'); // Scripts should be removed
    expect(html).not.toContain('<style>'); // Inline styles should be cleaned

    // Should preserve important semantic elements
    expect(html).toContain('<h1');
    expect(html).toContain('<form');
    expect(html).toContain('<input');
    expect(html).toContain('<button');
  });

  test('should handle multiple selectors', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [
        { css: '#main-container' },
        { css: '[data-testid="submit-btn"]' },
        { role: 'list' },
      ],
    };

    const result = await inspector.extractHTML(options);

    expect(Object.keys(result.elements)).toHaveLength(3);
    expect(result.elements[0].matchedSelector).toEqual({
      css: '#main-container',
    });
    expect(result.elements[1].matchedSelector).toEqual({
      css: '[data-testid="submit-btn"]',
    });
    expect(result.elements[2].matchedSelector).toEqual({ role: 'list' });
  });

  test('should provide timing and statistics', async ({ page }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [{ css: 'body' }],
    };

    const result = await inspector.extractHTML(options);

    expect(result.timing).toBeDefined();
    expect(result.timing.totalMs).toBeGreaterThan(0);
    expect(result.timing.selectorResolutionMs).toBeGreaterThan(0);
    expect(result.timing.extractionMs).toBeGreaterThan(0);

    expect(result.stats).toBeDefined();
    expect(result.stats.elementsFound).toBe(1);
    expect(result.stats.selectorsNotFound).toBe(0);
    expect(result.stats.averageDepth).toBeGreaterThanOrEqual(0);
  });

  test('should handle selector resolution errors gracefully', async ({
    page,
  }) => {
    const inspector = new HTMLInspector(page);
    const options: HTMLInspectionOptions = {
      selectors: [
        { css: '#existing-element' }, // Non-existent
        { css: '#main-container' }, // Exists
      ],
    };

    const result = await inspector.extractHTML(options);

    expect(result.stats.selectorsNotFound).toBe(1);
    expect(result.stats.elementsFound).toBe(1);
    expect(result.elements[0]).toBeUndefined(); // First selector failed
    expect(result.elements[1]).toBeDefined(); // Second selector succeeded
  });

  test('should support different output formats', async ({ page }) => {
    const inspector = new HTMLInspector(page);

    // Test HTML format
    const htmlOptions: HTMLInspectionOptions = {
      selectors: [{ css: 'h1' }],
      format: 'html',
    };
    const htmlResult = await inspector.extractHTML(htmlOptions);
    expect(htmlResult.elements[0].html).toContain('<h1');

    // Test text format
    const textOptions: HTMLInspectionOptions = {
      selectors: [{ css: 'h1' }],
      format: 'text',
    };
    const textResult = await inspector.extractHTML(textOptions);
    expect(textResult.elements[0].html).toBe('Main Heading');

    // Test ARIA format
    const ariaOptions: HTMLInspectionOptions = {
      selectors: [{ css: 'h1' }],
      format: 'aria',
    };
    const ariaResult = await inspector.extractHTML(ariaOptions);
    expect(ariaResult.elements[0].html).toContain('h1:');
  });

  test('should handle performance thresholds and provide warnings', async ({
    page,
  }) => {
    const inspector = new HTMLInspector(page);

    // Create a large DOM structure
    await page.evaluate(() => {
      const container = document.getElementById('main-container');
      if (container) {
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.textContent = `Generated content ${i}`;
          container.appendChild(div);
        }
      }
    });

    const options: HTMLInspectionOptions = {
      selectors: [{ css: '#main-container' }],
      depth: 3,
    };

    const result = await inspector.extractHTML(options);

    // Should provide performance suggestions if content is large
    if (result.totalSizeBytes > 30_000) {
      // 30KB threshold
      expect(result.suggestions).toContain(
        'Large content detected. Consider reducing depth or using more specific selectors.'
      );
    }
  });
});
