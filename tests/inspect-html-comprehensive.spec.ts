import { expect, test } from './fixtures.js';

// Regex patterns for testing
const DATA_TESTID_PATTERN = /data-testid/;
const TIMING_TOTAL_PATTERN = /total: \d+ms/;
const TIMING_SELECTOR_PATTERN = /selector resolution: \d+ms/;
const TIMING_EXTRACTION_PATTERN = /extraction: \d+ms/;
const STATS_ELEMENTS_PATTERN = /elements found: \d+/;
const STATS_SELECTORS_PATTERN = /selectors not found: \d+/;
const STATS_DEPTH_PATTERN = /average depth: [\d.]+/;
const STATS_SIZE_PATTERN = /Total size: \d+ bytes/;

test.describe('browser_inspect_html comprehensive tests', () => {
  test('full functionality demonstration', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Comprehensive Test Page</title>
      <div id="main-container" class="container">
        <header role="banner">
          <h1 data-testid="main-heading">Welcome to Test Site</h1>
          <nav role="navigation" class="main-nav">
            <ul>
              <li><a href="#home" class="nav-link active">Home</a></li>
              <li><a href="#about" class="nav-link">About</a></li>
              <li><a href="#contact" class="nav-link">Contact</a></li>
            </ul>
          </nav>
        </header>
        
        <main role="main">
          <section class="content-section">
            <h2>About Our Service</h2>
            <p class="description">
              This is a <strong>comprehensive test</strong> of HTML inspection capabilities.
              It includes various HTML elements to test different features.
            </p>
            
            <div class="feature-grid">
              <div class="feature-card" data-feature="analytics">
                <h3>Analytics</h3>
                <p>Track your data with precision</p>
              </div>
              <div class="feature-card" data-feature="security">
                <h3>Security</h3>
                <p>Enterprise-grade protection</p>
              </div>
            </div>
          </section>
          
          <form id="contact-form" role="form" class="contact-form">
            <h2>Get In Touch</h2>
            <div class="form-group">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" name="message" rows="4"></textarea>
            </div>
            <button type="submit" class="btn-primary" data-testid="submit-btn">Send Message</button>
          </form>
        </main>
        
        <footer role="contentinfo" class="site-footer">
          <p>&copy; 2024 Test Company. All rights reserved.</p>
        </footer>
      </div>
      
      <div class="hidden-content" style="display: none;">
        This content should be filtered out
      </div>
      `,
      'text/html'
    );

    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX },
    });

    // Test 1: Basic HTML inspection
    const basicResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: '#main-container' }],
        format: 'html',
        includeAttributes: true,
      },
    });

    expect(basicResult.content?.[0]?.text).toContain('main-container');
    expect(basicResult.content?.[0]?.text).toContain('elements found: 1');
    expect(basicResult.content?.[0]?.text).toContain('Welcome to Test Site');
    expect(basicResult.content?.[0]?.text).toContain('class="container"');

    // Test 2: Multiple role-based selectors
    const roleResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [
          { role: 'banner' },
          { role: 'navigation' },
          { role: 'form' },
        ],
        format: 'html',
      },
    });

    expect(roleResult.content?.[0]?.text).toContain('elements found: 3');
    expect(roleResult.content?.[0]?.text).toContain('Welcome to Test Site');
    expect(roleResult.content?.[0]?.text).toContain('main-nav');
    expect(roleResult.content?.[0]?.text).toContain('contact-form');

    // Test 3: Depth control and exclusion
    const depthResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: 'body' }],
        depth: 2,
        excludeSelector: '.hidden-content',
        format: 'html',
        maxSize: 5000, // Small size to test truncation awareness
      },
    });

    expect(depthResult.content?.[0]?.text).toContain('depth: 2');
    expect(depthResult.content?.[0]?.text).not.toContain(
      'This content should be filtered out'
    );

    // Test 4: Text format extraction
    const textResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: 'h1' }],
        format: 'text',
      },
    });

    expect(textResult.content?.[0]?.text).toContain('Welcome to Test Site');
    expect(textResult.content?.[0]?.text).not.toContain('<h1');

    // Test 5: CSS selector suggestions
    const suggestionsResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: '[data-testid="main-heading"]' }],
        includeSuggestions: true,
      },
    });

    expect(suggestionsResult.content?.[0]?.text).toContain(
      'CSS Selector Suggestions:'
    );
    expect(suggestionsResult.content?.[0]?.text).toMatch(DATA_TESTID_PATTERN);

    // Test 6: LLM optimization
    const optimizedResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [{ css: 'main' }],
        optimizeForLLM: true,
      },
    });

    expect(optimizedResult.content?.[0]?.text).toContain(
      'optimizeForLLM: true'
    );
    expect(optimizedResult.content?.[0]?.text).toContain('About Our Service');
    expect(optimizedResult.content?.[0]?.text).toContain('Analytics');

    // Test 7: Error handling - non-existent selector
    const errorResult = await client.callTool({
      name: 'browser_inspect_html',
      arguments: {
        selectors: [
          { css: '#non-existent-element' },
          { css: 'h1' }, // This one exists
        ],
      },
    });

    expect(errorResult.content?.[0]?.text).toContain('elements found: 1');
    expect(errorResult.content?.[0]?.text).toContain('selectors not found: 1');
    expect(errorResult.content?.[0]?.text).toContain('Welcome to Test Site');
  });

  test('performance and timing information', async ({ client, server }) => {
    server.setContent(
      '/',
      `
      <title>Performance Test</title>
      <div id="test-container">
        ${Array.from(
          { length: 50 },
          (_, i) => `<div class="item-${i}">Item ${i} content</div>`
        ).join('')}
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
        selectors: [{ css: '#test-container' }],
        depth: 3,
      },
    });

    const responseText = result.content?.[0]?.text || '';

    // Verify timing information is included
    expect(responseText).toMatch(TIMING_TOTAL_PATTERN);
    expect(responseText).toMatch(TIMING_SELECTOR_PATTERN);
    expect(responseText).toMatch(TIMING_EXTRACTION_PATTERN);

    // Verify statistics
    expect(responseText).toMatch(STATS_ELEMENTS_PATTERN);
    expect(responseText).toMatch(STATS_SELECTORS_PATTERN);
    expect(responseText).toMatch(STATS_DEPTH_PATTERN);
    expect(responseText).toMatch(STATS_SIZE_PATTERN);
  });
});
