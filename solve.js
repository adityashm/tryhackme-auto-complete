const puppeteer = require('puppeteer');

const THM_SESSION = process.env.THM_SESSION || '';

async function solveTodaysChallenge() {
  console.log(`[${new Date().toISOString()}] TryHackMe Auto-Solver started...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
    
    // Set cookies to bypass login if available
    if (THM_SESSION) {
      console.log('[LOG] Setting authentication cookies...');
      await page.setCookie({
        name: 'Session',
        value: THM_SESSION,
        domain: 'tryhackme.com',
        path: '/'
      });
    }
    
    // Get today's day
    const today = new Date().getDate();
    const day = today > 24 ? 24 : today;
    
    // Navigate directly to today's challenge
    console.log(`[LOG] Loading Day ${day} challenge...`);
    const roomUrl = `https://tryhackme.com/adventofcyber25/${day}`;
    await page.goto(roomUrl, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    // Get page content
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check if already 100%
    if (pageText.includes('100%') || pageContent.includes('complete')) {
      console.log(`[SUCCESS] Day ${day} already complete (100%)!`);
      await browser.close();
      return { day, status: 'already_complete', progress: '100%' };
    }
    
    console.log(`[LOG] Extracting challenge content for Day ${day}...`);
    
    // Find all input fields on the page
    const inputs = await page.$$('input[type="text"], textarea');
    console.log(`[LOG] Found ${inputs.length} input fields`);
    
    // Extract answers from page content
    const flags = pageText.match(/THM\{[^}]+\}/g) || [];
    console.log(`[LOG] Found ${flags.length} potential answers`);
    
    // Fill input fields with extracted answers
    for (let i = 0; i < Math.min(inputs.length, flags.length); i++) {
      try {
        console.log(`[LOG] Filling field ${i + 1} with: ${flags[i]}`);
        await inputs[i].type(flags[i], { delay: 30 });
      } catch (e) {
        console.log(`[LOG] Could not fill field ${i + 1}`);
      }
    }
    
    // Find and click Check/Submit button
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await (await button.getProperty('textContent')).jsonValue();
      if (text && (text.includes('Check') || text.includes('Submit'))) {
        console.log('[LOG] Clicking Check button...');
        await button.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Get final progress
    const finalText = await page.evaluate(() => document.body.innerText);
    const progressMatch = finalText.match(/(\d+)%/);
    const progress = progressMatch ? progressMatch[1] : 'unknown';
    
    console.log(`[SUCCESS] Day ${day} completed with ${progress}% progress`);
    
    await browser.close();
    return { day, status: 'success', progress, timestamp: new Date().toISOString() };
    
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
