import { test, expect } from '@playwright/test';
import path from 'path';

test('Capture Dashboard Screenshot', async ({ page }) => {
  // Increase timeout for slow CI/local env
  test.setTimeout(60000);

  // 1. Login
  await page.goto('http://localhost:8086/');
  await page.locator('input[name="email"]').fill('gustavocastro73@gmail.com');
  await page.locator('input[name="password"]').fill('castro');
  await page.getByRole('button', { name: 'Entrar no sistema' }).click();

  // 2. Workspace Selection
  // Wait for the workspace selection page
  await expect(page).toHaveURL(/.*workspaces/);
  
  // Select "Teleen Consultoria"
  const workspaceCard = page.getByText('Teleen Consultoria');
  await expect(workspaceCard).toBeVisible();
  await workspaceCard.click();

  // 3. Dashboard
  // Wait for dashboard to load
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Give it some time to fetch data and render charts
  await page.waitForTimeout(5000);

  // 4. Take Screenshot
  const screenshotPath = path.join(__dirname, '../../dashboard_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`Screenshot saved to: ${screenshotPath}`);
});
