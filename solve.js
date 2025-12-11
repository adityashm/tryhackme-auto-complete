const puppeteer = require('puppeteer');
const fs = require('fs');

const THM_USERNAME = process.env.THM_USERNAME;
const THM_PASSWORD = process.env.THM_PASSWORD;

const ROOMS = [
  { day: 10, url: 'https://tryhackme.com/room/adventofcyber25/10' },
  { day: 11, url: 'https://tryhackme.com/room/adventofcyber25/11' },
  { day: 12, url: 'https://tryhackme.com/room/adventofcyber25/12' },
  { day: 13, url: 'https://tryhackme.com/room/adventofcyber25/13' },
  { day: 14, url: 'https://tryhackme.com/room/adventofcyber25/14' },
  { day: 15, url: 'https://tryhackme.com/room/adventofcyber25/15' },
  { day: 16, url: 'https://tryhackme.com/room/adventofcyber25/16' },
  { day: 17, url: 'https://tryhackme.com/room/adventofcyber25/17' },
  { day: 18, url: 'https://tryhackme.com/room/adventofcyber25/18' },
  { day: 19, url: 'https://tryhackme.com/room/adventofcyber25/19' },
  { day: 20, url: 'https://tryhackme.com/room/adventofcyber25/20' },
  { day: 21, url: 'https://tryhackme.com/room/adventofcyber25/21' },
  { day: 22, url: 'https://tryhackme.com/room/adventofcyber25/22' },
  { day: 23, url: 'https://tryhackme.com/room/adventofcyber25/23' },
  { day: 24, url: 'https://tryhackme.com/room/adventofcyber25/24' },
];

async function getTodayDay() {
  const today = new Date().getDate();
  return today > 24 ? 24 : today;
}

async function solveChallenge(day) {
  console.log(`[${new Date().toISOString()}] Starting Day ${day} challenge...`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Login
    console.log('[LOG] Logging in...');
    await page.goto('https://tryhackme.com/login', { waitUntil: 'networkidle0' });
    await page.type('[name="username"]', THM_USERNAME);
    await page.type('[name="password"]', THM_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Navigate to room
    const room = ROOMS.find(r => r.day === day);
    console.log(`[LOG] Opening Day ${day} room...`);
    await page.goto(room.url, { waitUntil: 'networkidle0' });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check if room is complete
    const progressText = await page.$eval('[class*="progress"]', el => el.textContent);
    if (progressText.includes('100%')) {
      console.log(`[SUCCESS] Day ${day} already completed (100%)`);
      await browser.close();
      return { day, status: 'already_complete' };
    }
    
    console.log(`[LOG] Day ${day} progress: ${progressText}`);
    console.log(`[NOTICE] Manual solving required or AI extraction needed for Day ${day}`);
    
    await browser.close();
    return { day, status: 'needs_manual', progress: progressText };
    
  } catch (error) {
    console.error(`[ERROR] Day ${day} failed:`, error.message);
    await browser.close();
    return { day, status: 'error', error: error.message };
  }
}

(async () => {
  try {
    const day = await getTodayDay();
    const result = await solveChallenge(day);
    console.log(`\n[RESULT]`, result);
    process.exit(result.status === 'already_complete' ? 0 : 1);
  } catch (error) {
    console.error('[FATAL]', error);
    process.exit(1);
  }
})();
