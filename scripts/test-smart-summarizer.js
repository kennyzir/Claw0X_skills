const assert = require('assert');
const path = require('path');

const { __testables } = require(path.join(__dirname, '..', 'dist', 'skills', 'smart-summarizer', 'handler.js'));

function testExtractInput() {
  const flat = __testables.extractInput({ text: 'hello', style: 'bullet' });
  assert.deepStrictEqual(flat, { text: 'hello', style: 'bullet' });

  const wrapped = __testables.extractInput({ input: { text: 'hello', style: 'brief' } });
  assert.deepStrictEqual(wrapped, { text: 'hello', style: 'brief' });
}

function testSummaryShape() {
  const source = {
    kind: 'text',
    content: [
      'Smart summarization helps teams process long reports faster.',
      'It reduces reading overhead and surfaces key points earlier.',
      'This makes document triage and research review easier for operators.'
    ].join(' '),
  };

  const result = __testables.createSummary(source, 'bullet', 3, 'auto');

  assert.strictEqual(result.source_type, 'text');
  assert.ok(typeof result.summary === 'string' && result.summary.includes('- '));
  assert.ok(Array.isArray(result.bullets) && result.bullets.length === 3);
  assert.ok(Array.isArray(result.key_points) && result.key_points.length === 3);
  assert.ok(Array.isArray(result.keywords) && result.keywords.length > 0);
  assert.strictEqual(result.detected_language, 'auto');
}

function testConfigInference() {
  assert.strictEqual(__testables.inferStyle({ style: 'bullet' }), 'bullet');
  assert.strictEqual(__testables.inferStyle({ summary_type: 'research_digest' }), 'executive');
  assert.strictEqual(__testables.clampSentenceLimit({ max_length: 150 }), 2);
  assert.strictEqual(__testables.clampSentenceLimit({ max_sentences: 9 }), 9);
}

async function testUrlMode() {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null;
      },
    },
    async text() {
      return `
        <html>
          <head><title>Research Brief</title></head>
          <body>
            <article>
              <p>Smart summarization helps teams scan public webpages faster.</p>
              <p>It extracts readable content, removes markup noise, and returns concise key points.</p>
              <p>This is useful for research workflows and document triage.</p>
            </article>
          </body>
        </html>
      `;
    },
  });

  try {
    const source = await __testables.fetchUrlContent('https://example.com/report');
    assert.strictEqual(source.kind, 'url');
    assert.strictEqual(source.title, 'Research Brief');
    assert.strictEqual(source.url, 'https://example.com/report');
    assert.ok(source.content.includes('Smart summarization helps teams scan public webpages faster.'));

    const result = __testables.createSummary(source, 'brief', 2, 'auto');
    assert.strictEqual(result.source_type, 'url');
    assert.strictEqual(result.source_url, 'https://example.com/report');
    assert.strictEqual(result.title, 'Research Brief');
    assert.ok(result.summary.includes('Smart summarization helps teams scan public webpages faster.'));
  } finally {
    global.fetch = originalFetch;
  }
}

async function main() {
  testExtractInput();
  testSummaryShape();
  testConfigInference();
  await testUrlMode();
  console.log('smart-summarizer regression tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
