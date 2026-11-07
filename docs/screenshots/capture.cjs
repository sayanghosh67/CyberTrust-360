const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 2 });

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2', timeout: 15000 });

  // 1. Capture Dashboard Screenshot
  const dashboardPath = path.resolve(__dirname, 'dashboard.png');
  await page.screenshot({ path: dashboardPath, fullPage: false });
  console.log('Saved dashboard screenshot:', dashboardPath);

  // 2. Click the preset button for 'paypa1-login.com' to trigger an investigation!
  console.log('Triggering investigation for sample target...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('paypa1-login.com')) {
      await btn.click();
      break;
    }
  }

  // Wait for the investigation report to appear
  console.log('Waiting for investigation report...');
  await page.waitForSelector('h2', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000)); // allow animations to settle

  // Capture Investigation Report Screenshot
  const reportPath = path.resolve(__dirname, 'investigation_report.png');
  await page.screenshot({ path: reportPath, fullPage: true });
  console.log('Saved investigation report screenshot:', reportPath);

  await browser.close();
  console.log('Screenshots successfully captured!');
})();
