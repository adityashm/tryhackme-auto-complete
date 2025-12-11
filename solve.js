const puppeteer = require('puppeteer');

const THM_SESSION = process.env.THM_SESSION || '';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function solveTodaysChallenge() {
  console.log(`[${new Date().toISOString()}] TryHackMe Auto-Solver started...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
    
    const today = new Date().getDate();
    const day = today > 24 ? 24 : today;
    
    console.log(`[LOG] Loading Day ${day} challenge...`);
    const roomUrl = `https://tryhackme.com/adventofcyber25/${day}`;
    await page.goto(roomUrl, { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.includes('100%')) {
      console.log(`[SUCCESS] Day ${day} already 100% complete!`);
      await browser.close();
      return { day, status: 'already_complete' };
    }
    
    console.log(`[LOG] Extracting flags from Day ${day}...`);
    const flags = pageText.match(/THM\{[^}]+\}/g) || [];
    console.log(`[LOG] Found ${flags.length} flags`);
    
    const inputs = await page.$$('input[type="text"], textarea');
    console.log(`[LOG] Found ${inputs.length} input fields`);
    
    for (let i = 0; i < Math.min(inputs.length, flags.length); i++) {
      try {
        console.log(`[LOG] Filling field ${i + 1} with: ${flags[i]}`);
        await inputs[i].type(flags[i], { delay: 30 });
      } catch (e) {
        console.log(`[LOG] Error filling field: ${e.message}`);
      }
    }
    
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text && (text.includes('Check') || text.includes('Submit'))) {
        console.log('[LOG] Clicking submit button...');
        await btn.click();
        await sleep(2000);
        break;
      }
    }
    
    const finalText = await page.evaluate(() => document.body.innerText);
    const progress = (finalText.match(/(\d+)%/) || [])[1] || 'unknown';
    
    console.log(`[SUCCESS] Day ${day} completed with ${progress}% progress`);
    await browser.close();
    return { day, status: 'success', progress };
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    await browser.close();
    return { status: 'error', message: error.message };
  }
}

(async () => {
  const result = await solveTodaysChallenge();
  console.log('\n[FINAL RESULT]');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === 'success' || result.status === 'already_complete' ? 0 : 1);
})();
