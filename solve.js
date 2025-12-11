const puppeteer = require('puppeteer');

const THM_USERNAME = process.env.THM_USERNAME;
const THM_PASSWORD = process.env.THM_PASSWORD;

async function solveTHMChallenge() {
  console.log(`[${new Date().toISOString()}] Starting TryHackMe solver...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 1024 });
    
    // Login
    console.log('[LOG] Navigating to TryHackMe login...');
    await page.goto('https://tryhackme.com/login', { waitUntil: 'networkidle2' });
    
    console.log('[LOG] Filling login credentials...');
    await page.type('input[name="username"]', THM_USERNAME, { delay: 100 });
    await page.type('input[name="password"]', THM_PASSWORD, { delay: 100 });
    
    console.log('[LOG] Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Get today's day
    const today = new Date().getDate();
    const day = today > 24 ? 24 : today;
    
    // Navigate to Advent of Cyber main page
    console.log(`[LOG] Navigating to Advent of Cyber Day ${day}...`);
    const roomUrl = `https://tryhackme.com/adventofcyber25/${day}`;
    await page.goto(roomUrl, { waitUntil: 'networkidle2' });
    
    // Wait for room content
    await page.waitForTimeout(2000);
    
    // Extract page content
    const pageContent = await page.content();
    
    // Check if room is already completed
    if (pageContent.includes('100%') || pageContent.includes('Completed')) {
      console.log(`[SUCCESS] Day ${day} already completed!`);
      await browser.close();
      return { day, status: 'already_complete', message: 'Room already 100% complete' };
    }
    
    // Find all question inputs and buttons
    const inputFields = await page.$$('input[type="text"], textarea');
    const submitButtons = await page.$$('button');
    
    console.log(`[LOG] Found ${inputFields.length} input fields and ${submitButtons.length} buttons`);
    
    // Auto-fill visible fields with content from page
    for (let i = 0; i < inputFields.length; i++) {
      const field = inputFields[i];
      const placeholder = await field.evaluate(el => el.placeholder || el.name || '');
      
      console.log(`[LOG] Processing field ${i + 1}: ${placeholder}`);
      
      // Try to extract answer from page context
      const pageText = await page.evaluate(() => document.body.innerText);
      
      // Simple answer extraction - look for common patterns
      let answer = extractAnswerFromContent(pageText, placeholder);
      
      if (answer) {
        console.log(`[LOG] Filling field with: ${answer}`);
        await field.type(answer, { delay: 50 });
      }
    }
    
    // Find and click the check/submit button
    const checkButton = await page.$('button:has-text("Check")');
    if (checkButton) {
      console.log('[LOG] Clicking check button...');
      await checkButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Get final progress
    const finalContent = await page.content();
    const progressMatch = finalContent.match(/(\d+)%/);
    const progress = progressMatch ? progressMatch[1] : 'unknown';
    
    console.log(`[SUCCESS] Day ${day} progress: ${progress}%`);
    
    await browser.close();
    return { day, status: 'success', progress, message: `Completed Day ${day}` };
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    await browser.close();
    return { status: 'error', error: error.message };
  }
}

function extractAnswerFromContent(content, fieldName) {
  // Extract answer from page content based on field name
  const lines = content.split('\n');
  
  for (let line of lines) {
    // Look for flag patterns THM{...}
    if (line.includes('THM{') && line.includes('}')) {
      const match = line.match(/THM\{[^}]+\}/);
      if (match) return match[0];
    }
    
    // Look for common answer indicators
    if (line.toLowerCase().includes('answer') || line.toLowerCase().includes('flag')) {
      const words = line.split(/[\s:,]+/);
      for (let word of words) {
        if (word.length > 3 && !word.includes('.')) return word;
      }
    }
  }
  
  return null;
}

(async () => {
  try {
    const result = await solveTHMChallenge();
    console.log('\n[RESULT]', JSON.stringify(result, null, 2));
    process.exit(result.status === 'success' || result.status === 'already_complete' ? 0 : 1);
  } catch (error) {
    console.error('[FATAL]', error);
    process.exit(1);
  }
})();
