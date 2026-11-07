/** Local browser regressions. The race/error cases use explicit fixtures; the first flow uses the live API.
 * Run with a disposable local demo backend, never a public deployment.
 * BASE_URL=http://127.0.0.1:15173 node frontend/tests/graph-visibility.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../node_modules/puppeteer');
const base = process.env.BASE_URL || 'http://127.0.0.1:15173';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use an isolated local demo');
const out = path.resolve(process.env.QA_OUTPUT || 'hackathon-video/remediation/graph-3d');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const result = { checks: new Proxy({}, { set(target, key, value) { target[key] = value; console.log('PASS', key); return true; } }), errors: [], widths: [] };
const searchSelector = '[aria-label="Search threat relationships"]';
const clickText = async (p, text, scope = '#relationship-graph') => {
  const button = await p.evaluateHandle((scope, text) => [...document.querySelectorAll(`${scope} button`)].find(e => e.textContent.includes(text)), scope, text);
  assert(button.asElement(), `Button ${text} exists`); await button.asElement().click(); await button.dispose();
};
const ready = p => p.waitForFunction(() => document.querySelector('.threat-graph-canvas')?.getAttribute('aria-busy') === 'false');
const visibleNodes = p => p.evaluate(() => {
  const canvas = document.querySelector('.threat-graph-canvas').getBoundingClientRect();
  return [...document.querySelectorAll('.react-flow__node')].filter(n => { const b = n.getBoundingClientRect(); return getComputedStyle(n).visibility !== 'hidden' && b.width > 0 && b.left >= canvas.left - 1 && b.right <= canvas.right + 1 && b.top >= canvas.top - 1 && b.bottom <= canvas.bottom + 1; }).length;
});
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => result.errors.push(e.message));
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${base}/#relationship-graph`, { waitUntil: 'networkidle0' });
    await ready(page);
    await page.waitForSelector('.graph-empty');
    const graph = await page.$eval('#relationship-graph', e => ({ opacity: getComputedStyle(e).opacity, top: e.getBoundingClientRect().top }));
    assert.equal(graph.opacity, '1'); assert(graph.top >= 0 && graph.top < 300); result.checks.directHashAndEmptyState = true;
    await page.screenshot({ path: `${out}/empty-state.png` });

    // Actual deterministic analysis, persisted in this new visitor's isolated demo session.
    await page.type('#scam-dna textarea', 'SYNTHETIC QA: Your SBI bank KYC will expire. Share your OTP immediately at https://example.com/kyc to avoid account suspension.');
    const response = page.waitForResponse(r => r.url().includes('/scam/analyze') && r.request().method() === 'POST');
    await clickText(page, 'Analyze Scam DNA', '#scam-dna');
    assert.equal((await response).status(), 201);
    await page.waitForSelector('.react-flow__node'); await ready(page);
    await page.$eval('#relationship-graph', e => e.scrollIntoView({ behavior: 'instant' }));
    await sleep(500); assert(await visibleNodes(page) > 0); result.checks.liveAnalysisAutomaticallyRefreshesGraph = true;
    await page.screenshot({ path: `${out}/live-graph.png` });

    await page.type(searchSelector, 'zzzz-no-matching-indicator');
    await page.waitForFunction(() => document.querySelector('.graph-empty')?.textContent.includes('No matching'));
    await clickText(page, 'Clear filters'); await page.waitForSelector('.react-flow__node'); await ready(page);
    result.checks.noMatchesAndRecovery = true;
    await page.click('#relationship-graph input[type="checkbox"]');
    await page.waitForFunction(() => document.querySelector('#relationship-graph').textContent.includes('SYNTHETIC DEMONSTRATION DATASET ACTIVE'));
    await ready(page); await sleep(400); assert(await visibleNodes(page) > 0); result.checks.explicitSyntheticDataset = true;
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewport({ width, height: 1000 }); await sleep(450);
      assert(await visibleNodes(page) > 0, `Nodes visible at ${width}`);
      result.widths.push(await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })));
    }
    await page.$eval('.threat-graph-canvas', e => e.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.screenshot({ path: `${out}/mobile-graph.png` });
    result.checks.responsiveFit = true;
    await page.$eval('.react-flow__node', e => e.click());
    await page.waitForSelector('[aria-label="Close detail panel"]');
    assert(await page.$eval('.graph-detail', e => { const b=e.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth; }));
    await page.click('[aria-label="Close detail panel"]'); result.checks.mobileDetailFits = true;
    await page.setViewport({ width: 1440, height: 1000 });
    await clickText(page, 'All Entities ('); await sleep(400); assert(await visibleNodes(page) > 0); result.checks.fullDatasetFit = true;
    await page.$eval('.react-flow__node', e => e.click());
    await page.waitForSelector('[aria-label="Close detail panel"]');
    result.checks.nodeSelection = true;
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await sleep(1300);
    assert.equal(await page.$eval('.security-cube', e => getComputedStyle(e).transformStyle), 'preserve-3d');
    const pose = await page.$eval('.security-cube', e => getComputedStyle(e).transform); await sleep(350);
    assert.notEqual(await page.$eval('.security-cube', e => getComputedStyle(e).transform), pose);
    await page.screenshot({ path: `${out}/hero-3d.png` }); result.checks.animated3dGeometry = true;
    await page.click('[aria-label="Pause decorative motion"]'); await sleep(100);
    const paused = await page.$eval('.security-cube', e => getComputedStyle(e).transform); await sleep(200);
    assert.equal(await page.$eval('.security-cube', e => getComputedStyle(e).transform), paused); result.checks.pauseMotion = true;
    await page.click('[aria-label="Play decorative motion"]');
    await sleep(100); assert.equal(await page.$eval('.hero-copy h1', e => getComputedStyle(e).opacity), '1'); result.checks.pauseDoesNotHideContent = true;
    await page.setViewport({ width: 390, height: 844 }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await sleep(600); await page.screenshot({ path: `${out}/mobile-3d.png` });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.security-cube', e => getComputedStyle(e).animationName), 'none'); result.checks.reducedMotion = true;

    // Controlled browser fixtures verify cancellation/races/errors, without changing API data.
    const fixture = await browser.newPage(); fixture.on('pageerror', e => result.errors.push(e.message));
    let requestedOld = false, oldCancelled = false, fail = false;
    await fixture.setRequestInterception(true);
    fixture.on('requestfailed', r => { if (new URL(r.url()).searchParams.get('search') === 'old') oldCancelled = true; });
    const payload = label => ({ nodes: [{ id: label, type: 'domain', label, report_count: 1, properties: {} }], edges: [], total_reports_analyzed: 1, verified_relationships_count: 0, possible_relationships_count: 0, is_demo_data: false, generated_at: '2026-11-07T00:00:00Z' });
    fixture.on('request', async r => {
      if (!r.url().includes('/intelligence/graph') || r.method() !== 'GET') return r.continue();
      const query = new URL(r.url()).searchParams.get('search') || 'baseline';
      if (query === 'old') { requestedOld = true; await sleep(1200); }
      try { await r.respond({ status: fail ? 503 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': base }, body: JSON.stringify(fail ? { detail: 'Controlled QA outage' } : payload(query)) }); } catch { /* Cancelled old request has no receiver. */ }
    });
    await fixture.goto(`${base}/#relationship-graph`, { waitUntil: 'networkidle0' }); await ready(fixture);
    await fixture.type(searchSelector, 'old');
    while (!requestedOld) await sleep(50);
    await fixture.click(searchSelector, { clickCount: 3 }); await fixture.keyboard.press('Backspace'); await fixture.type(searchSelector, 'new');
    await fixture.waitForFunction(() => [...document.querySelectorAll('.react-flow__node')].some(e => e.textContent.includes('new')));
    await sleep(1400); assert(await fixture.$eval('.react-flow__node', e => e.textContent.includes('new'))); assert(oldCancelled); result.checks.obsoleteRequestCancelledAndCannotOverwrite = true;
    await fixture.$eval('.threat-graph-canvas', e => { e.style.display = 'none'; }); await sleep(50);
    await fixture.$eval('.threat-graph-canvas', e => { e.style.display = ''; }); await sleep(350);
    assert(await visibleNodes(fixture) > 0); result.checks.hiddenContainerRecovery = true;
    fail = true; await fixture.click('[title="Refresh Graph from Database"]'); await fixture.waitForSelector('.threat-graph-canvas [role="alert"]');
    fail = false; await clickText(fixture, 'Retry Graph Load'); await ready(fixture); assert.equal(await fixture.$('.threat-graph-canvas [role="alert"]'), null); result.checks.errorAndRetry = true;
    assert(result.widths.every(w => w.viewport === w.document)); assert.equal(result.errors.length, 0);
    fs.writeFileSync(`${out}/qa.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
