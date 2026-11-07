const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 2 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2', timeout: 15000 });

  // 1. Locate Threat Relationship Graph Section
  console.log('Locating Threat Relationship Graph section...');
  const graphSection = await page.$('#relationship-graph');
  if (graphSection) {
    await graphSection.scrollIntoView();
  }
  await new Promise(r => setTimeout(r, 2000));

  // Capture Dashboard Overview Screenshot
  const graphPath = path.resolve(__dirname, 'threat_relationship_graph.png');
  if (graphSection) {
    await graphSection.screenshot({ path: graphPath });
  } else {
    await page.screenshot({ path: graphPath });
  }
  console.log('Saved Threat Relationship Graph screenshot:', graphPath);

  // 2. Click a graph node to open the side panel
  console.log('Clicking a graph node to open telemetry drawer...');
  const nodeEl = await page.$('.react-flow__node');
  if (nodeEl) {
    await nodeEl.click();
    console.log('Clicked graph node');
    await new Promise(r => setTimeout(r, 1000));
  }

  // 3. In the side panel, click a Connected Relationship button to view detailed evidence!
  console.log('Clicking a Connected Relationship button inside the drawer...');
  const relBtn = await page.$('button.group');
  if (relBtn) {
    await relBtn.click();
    console.log('Clicked connected relationship button inside drawer');
  } else {
    // Fallback: select any button with relationship type
    const drawerButtons = await page.$$('.space-y-1\\.5 button');
    if (drawerButtons.length > 0) {
      await drawerButtons[0].click();
      console.log('Clicked first drawer button');
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  // Capture Selected Relationship & Evidence Screenshot
  const detailPath = path.resolve(__dirname, 'selected_relationship_evidence.png');
  if (graphSection) {
    await graphSection.screenshot({ path: detailPath });
  } else {
    await page.screenshot({ path: detailPath });
  }
  console.log('Saved Selected Relationship Evidence screenshot:', detailPath);

  await browser.close();
  console.log('Phase 4 visual capture complete!');
})();
