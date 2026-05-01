const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    console.log('Navigating to login http://localhost:8086/login ...');
    await page.goto('http://localhost:8086/login', { waitUntil: 'networkidle' });
    
    await page.screenshot({ path: path.join(__dirname, 'initial_page.png') });
    console.log('Initial page screenshot saved.');

    console.log('Waiting for email input...');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    
    await emailInput.fill('gustavocastro73@gmail.com');
    await page.locator('input[name="password"]').fill('castro');
    await page.getByRole('button', { name: /Entrar|Login/i }).click();

    console.log('Waiting for workspace selection...');
    await page.waitForURL(/.*workspaces/, { timeout: 10000 });
    
    await page.waitForSelector('text=Teleen Consultoria', { timeout: 10000 });
    const workspaceCard = page.getByText('Teleen Consultoria');
    await workspaceCard.click();

    console.log('Waiting for dashboard...');
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    console.log('Loading data...');
    await page.waitForTimeout(5000);

    const screenshotPath = path.join(__dirname, 'dashboard_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to: ${screenshotPath}`);

  } catch (err) {
    console.error('Error during capture:', err.message);
    await page.screenshot({ path: path.join(__dirname, 'error_screenshot.png') });
    console.log('Error screenshot saved.');
    console.log('Current URL:', page.url());
  } finally {
    await browser.close();
  }
})();
