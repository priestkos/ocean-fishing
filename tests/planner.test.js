// Run with: node --test tests/planner.test.js (requires Chromium on PATH).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const assets = pathToFileURL(path.join(root, 'website/assets/')).href;

function runInPlanner(body, beforeSite = '') {
  const site = process.env.TEST_SITE_JS ? pathToFileURL(path.resolve(process.env.TEST_SITE_JS)).href : assets + 'site.js';
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'ocean-planner-test-'));
  try {
    let html = fs.readFileSync(path.join(root, 'website/planner.html'), 'utf8');
    html = html.replaceAll('assets/', assets);
    html = html.replace('<script src="' + assets + 'site.js"></script>',
      '<script>' + beforeSite + '</script><script src="' + site + '"></script>');
    html = html.replace('</body>', `<script>
      document.addEventListener('DOMContentLoaded', function () {
        try { ${body} document.body.setAttribute('data-test-result', 'PASS'); }
        catch (e) { document.body.setAttribute('data-test-result', 'FAIL: ' + e.message); }
      });
    </script></body>`);
    const fixture = path.join(dir, 'planner.html');
    fs.writeFileSync(fixture, html);
    const output = execFileSync(process.env.CHROMIUM || 'chromium', [
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--allow-file-access-from-files', '--user-data-dir=' + path.join(dir, 'profile'),
      '--virtual-time-budget=1200', '--dump-dom', pathToFileURL(fixture).href
    ], { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
    const result = output.match(/data-test-result="([^"]*)"/);
    assert.ok(result, 'browser did not complete the planner assertions');
    assert.equal(result[1], 'PASS');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('planner renders hostile family attributes as text, not markup', () => {
  runInPlanner(`
    const value = '<img src=x onerror="window.injected=1">';
    const button = document.createElement('button');
    button.setAttribute('data-fam', value);
    document.getElementById('planfam').appendChild(button);
    button.click();
    const badge = document.querySelector('#planner .fam');
    if (!badge || badge.textContent !== value) throw new Error('hostile family not preserved as text');
    if (document.querySelector('#planner img') || window.injected) throw new Error('hostile family became markup');
  `);
});

test('planner treats hostile route, stop, fish, bait and points values as text', () => {
  runInPlanner(`
    document.querySelector('#planfam [data-fam=ruby]').click();
    const p = document.getElementById('planner');
    const checks = [
      ['.t', window.payload], ['h4', window.payload], ['.tod', window.payload],
      ['.tgt > span', window.payload], ['.tgt .b', window.payload], ['.tgt .count', window.payload]
    ];
    for (const [selector, value] of checks) {
      if (!p.querySelector(selector)?.textContent.includes(value)) throw new Error(selector + ' missing literal payload');
    }
    if (p.querySelector('img') || window.injected) throw new Error('payload interpreted as HTML');
  `, `
    window.payload = ${JSON.stringify('<img src=x onerror="window.injected=1"> & \'quoted\'')};
    window.OF_SITE = {
      rubyPattern: [window.payload], indigoPattern: ['BD'],
      ruby: [{ name: window.payload, meta: [[window.payload, window.payload]],
        stops: [{ name: window.payload, fish: [{ name: window.payload, points: window.payload,
          best: window.payload, bites: { [window.payload]: [1, 2] }, notes: 'intuition' }] }] }]
    };
  `);
});

test('normal planner family controls, counts, targets and countdown work', () => {
  runInPlanner(`
    function check(condition, message) { if (!condition) throw new Error(message); }
    const planner = document.getElementById('planner');
    function cards() { return [...planner.querySelectorAll('.voyage')]; }
    check(cards().length === 6, 'default count');
    check(cards().map(c => c.querySelector('.fam').textContent).join(',') === 'indigo,ruby,indigo,ruby,indigo,ruby', 'both family order');
    check(planner.querySelectorAll('[data-voycd]').length === 1, 'one countdown');
    check(cards()[0].classList.contains('next') && cards()[0].querySelector('[data-voycd]').textContent.startsWith('sails in '), 'next countdown');
    check(cards()[0].querySelectorAll('.stopcard').length === 3, 'indigo stops');
    check(cards()[1].querySelectorAll('.stopcard').length === 3, 'ruby stops');
    check(planner.querySelector('.tgt .b') && planner.querySelector('.tgt .count'), 'target bite and points');
    const ruby = document.querySelector('#planfam [data-fam=ruby]');
    ruby.click();
    check(ruby.classList.contains('on') && cards().every(c => c.querySelector('.fam').textContent === 'ruby'), 'ruby filter');
    const select = document.getElementById('plann');
    select.value = '3'; select.dispatchEvent(new Event('change', { bubbles: true }));
    check(cards().length === 3, 'changed count');
    document.querySelector('#planfam [data-fam=indigo]').click();
    check(cards().length === 3 && cards().every(c => c.querySelector('.fam').textContent === 'indigo'), 'indigo filter');
    check(planner.querySelectorAll('[data-voycd]').length === 1, 'countdown after rerender');
  `);
});
