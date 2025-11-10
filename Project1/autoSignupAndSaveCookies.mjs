// autoSignupAndSaveCookies.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import fetch from 'node-fetch'; // npm i node-fetch@2 if needed

// 1secmail helper (no API key required)
async function getEmails(login, domain) {
  const resp = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
  return resp.json();
}
async function readEmail(login, domain, id) {
  const resp = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
  return resp.json();
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create disposable email
  const login = 'smartdoko' + Math.floor(Math.random()*10000);
  const domain = '1secmail.com';
  const email = `${login}@${domain}`;
  console.log('Using temporary email:', email);

  // Go to signup (replace with real signup URL)
  await page.goto('https://smartdoko.com/register'); // adjust if different

  // Fill the signup form — adjust selectors to the real ones
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'SomeStrongPassword123!');
  // If there are other fields (name, phone) fill them similarly:
  // await page.fill('input[name="name"]', 'Test User');

  // Submit signup
  await page.click('button[type="submit"]');

  console.log('Waiting for verification email (up to 120 seconds)...');

  // Poll the disposable-email inbox for a verification message
  const maxAttempts = 24;
  let attempts = 0;
  let msgList = [];
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000)); // wait 5s
    msgList = await getEmails(login, domain);
    if (Array.isArray(msgList) && msgList.length > 0) break;
    attempts++;
  }

  if (!msgList || msgList.length === 0) {
    console.warn('No verification email arrived; continuing without verification. If SmartDoko requires email verification, you must verify manually.');
  } else {
    // Read the newest message and find a verification link
    const msg = msgList[0];
    const full = await readEmail(login, domain, msg.id);
    const body = full.body || full.htmlBody || full.textBody || full.content;
    // Attempt to extract first http(s) link
    const match = (body || '').match(/https?:\/\/[^"'\s]+/);
    if (match) {
      const link = match[0];
      console.log('Found verification link:', link);
      await page.goto(link);
      await page.waitForLoadState('networkidle');
      console.log('Verification link opened.');
    } else {
      console.log('No link found in email. Email preview:', full);
    }
  }

  // Now we assume account is active; save cookies
  const cookies = await context.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
  console.log('Cookies saved to cookies.json');

  await browser.close();
})();
