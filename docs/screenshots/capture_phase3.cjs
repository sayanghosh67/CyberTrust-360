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

  // 1. Locate Scam DNA Analyzer
  console.log('Locating Scam DNA section...');
  const scamDnaSection = await page.$('#scam-dna');
  if (scamDnaSection) {
    await scamDnaSection.scrollIntoView();
  }
  await new Promise(r => setTimeout(r, 1000));

  // 2. Click the preset for SBI KYC Trap
  console.log('Selecting SBI KYC Trap preset...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('SBI KYC Block')) {
      await btn.click();
      console.log('Clicked SBI KYC Block preset');
      break;
    }
  }

  await new Promise(r => setTimeout(r, 500));

  // 3. Click "Analyze Scam DNA"
  console.log('Clicking Analyze Scam DNA button...');
  const analyzeButtons = await page.$$('button');
  for (const btn of analyzeButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Analyze Scam DNA')) {
      await btn.click();
      console.log('Clicked Analyze Scam DNA');
      break;
    }
  }

  // 4. Wait for Scam DNA Report
  console.log('Waiting for Scam DNA report...');
  await page.waitForFunction(
    () => document.body.innerText.includes('Bank KYC') || document.body.innerText.includes('Threat Score'),
    { timeout: 10000 }
  );
  await new Promise(r => setTimeout(r, 1500));

  // Capture Scam DNA Analyzer Screenshot
  const scamDnaPath = path.resolve(__dirname, 'scam_dna_analyzer.png');
  const scamElement = await page.$('#scam-dna');
  if (scamElement) {
    await scamElement.screenshot({ path: scamDnaPath });
  } else {
    await page.screenshot({ path: scamDnaPath });
  }
  console.log('Saved Scam DNA Analyzer screenshot:', scamDnaPath);

  // 5. Scroll to Incident Guidance section
  console.log('Navigating to Incident Response Guidance...');
  const incidentSection = await page.$('#incident-guidance');
  if (incidentSection) {
    await incidentSection.scrollIntoView();
    await new Promise(r => setTimeout(r, 800));

    // Click "E. I made a UPI payment"
    const incidentButtons = await page.$$('button');
    for (const btn of incidentButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('I made a UPI payment')) {
        await btn.click();
        console.log('Selected UPI payment incident option');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    const guidancePath = path.resolve(__dirname, 'incident_guidance.png');
    await incidentSection.screenshot({ path: guidancePath });
    console.log('Saved Incident Guidance screenshot:', guidancePath);
  }

  await browser.close();
  console.log('Phase 3 visual verification complete!');
})();
