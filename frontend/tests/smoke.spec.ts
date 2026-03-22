import { test, expect } from '@playwright/test';

test.describe('Nexflow Smoke Test', () => {
  test('should load the login page correctly', async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error')
        console.log(`PAGE LOG ERROR: "${msg.text()}"`);
    });
    
    page.on('pageerror', exception => {
      console.log(`PAGE EXCEPTION: "${exception}"`);
    });

    // Navigate to the app (defaults to /login)
    await page.goto('/');
    
    // Debug: Wait a bit and log content if failing
    try {
        const mainTitle = page.getByRole('heading', { name: 'Teleen Consultoria', level: 1 });
        await expect(mainTitle).toBeVisible({ timeout: 5000 });
    } catch (e) {
        console.log('Test failed. Page content:');
        console.log(await page.content());
        throw e;
    }

    // Check for the subtitle
    await expect(page.getByText('Soluções inovadoras em Telecom')).toBeVisible();

    // Check for logo
    await expect(page.getByRole('img', { name: 'Teleen Logo' })).toBeVisible();

    // Check for login inputs
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // Check for the submit button
    await expect(page.getByRole('button', { name: 'Entrar no sistema' })).toBeVisible();
  });
});
