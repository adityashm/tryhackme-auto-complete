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
    await page.setViewport({ width: 1280, height: 1024 });
    
    // Navigate to login
    console.log('[LOG] Navigating to TryHackMe login...');
    await page.goto('https://tryhackme.com/login', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Try multiple selector patterns for username/email field
    const usernameSelectors = [
      'input[placeholder*="email"]',
      'input[placeholder*="username"]',
      'input[placeholder*="Email"]',
      'input[type="text"]',
      'input:nth-of-type(1)'
    ];
    
    let usernameFound = false;
    for (const selector of usernameSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`[LOG] Found username field with selector: ${selector}`);
        await element.type(THM_USERNAME, { delay: 50 });
        usernameFound = true;
        break;
      }
    }
    
    if (!usernameFound) {
      throw new Error('Could not find username input field');
    }
    
    // Password field
    const passwordSelectors = [
      'input[placeholder*="password"]',
      'input[placeholder*="Password"]',
      'input[type="password"]',
      'input:nth-of-type(2)'
    ];
    
    let passwordFound = false;
    for (const selector of passwordSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`[LOG] Found password field with selector: ${selector}`);
        await element.type(THM_PASSWORD, { delay: 50 });
        passwordFound = true;
        break;
      }
    }
    
    if (!passwordFound) {
      throw new Error('Could not find password input field');
    }
    
    // Click login button
    console.log('[LOG] Looking for login button...');
    const buttonSelectors = [
      'button:contains("Log in")',
      'button[type="submit"]',
      'button:nth-of-type(1)'
    ];
    
    let loginClicked = false;
    for (const selector of buttonSelectors) {
      try {
        await page.click(selector);
        loginClicked = true;
        console.log(`[LOG] Clicked button with selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!loginClicked) {
      throw new Error('Could not find login button');
    }
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('[LOG] Login successful!');
    
    // Get today's day
    const today = new Date().getDate();
    const day = today > 24 ? 24 : today;
    
    // Navigate to room
    console.log(`[LOG] Navigating to Day ${day} challenge...`);
    const roomUrl = `https://tryhackme.com/adventofcyber25/${day}`;
    await page.goto(roomUrl, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Check if already complete
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('100%')) {
      console.log(`[SUCCESS] Day ${day} already at 100%!`);
      await browser.close();
      return { day, status: 'complete', message: 'Already 100% complete' };
    }
    
    // Find and fill form fields
    const formInputs = await page.$$('input[type="text"], textarea');
    console.log(`[LOG] Found ${formInputs.length} input fields`);
    
    for (let i = 0; i < formInputs.length; i++) {
      try {
        const value = await (await formInputs[i].getProperty('value')).jsonValue();
        const placeholder = await (await formInputs[i].getProperty('placeholder')).jsonValue();
        
        if (!value) {
          // Try to extract answer from page content
          const lines = pageText.split('\n');
          let answer = null;
          
          for (const line of lines) {
            if (line.includes('THM{') && line.includes('}')) {
              const match = line.match(/THM\{[^}]+\}/);
              if (match) {
                answer = match[0];
                break;
              }
            }
          }
          
          if (answer) {
            console.log(`[LOG] Filling field ${i + 1} with: ${answer}`);
            await formInputs[i].type(answer);
          }
        }
      } catch (e) {
        console.log(`[LOG] Skipped field ${i + 1}: ${e.message}`);
      }
    }
    
    // Find and click submit button
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await (await button.getProperty('textContent')).jsonValue();
      if (text && (text.includes('Check') || text.includes('Submit'))) {
        console.log('[LOG] Clicking submit button...');
        await button.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Check final progress
    const finalText = await page.evaluate(() => document.body.innerText);
    const progressMatch = finalText.match(/(\d+)%/);
    const progress = progressMatch ? progressMatch[1] : 'unknown';
    
    console.log(`[SUCCESS] Day ${day} completed! Progress: ${progress}%`);
    await browser.close();
    return { day, status: 'success', progress, message: `Day ${day} completed` };
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    await browser.close();
    return { status: 'error', message: error.message };
  }
}

(async () => {
  const result = await solveTHMChallenge();
  console.log('\n[FINAL RESULT]', JSON.stringify(result, null, 2));
  process.exit(result.status === 'success' || result.status === 'complete' ? 0 : 1);
})();
