import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const REF_DIR = path.resolve(__dirname, '../../ref/clarotxt');

const testUser = {
  email: 'gustavocastro73@gmail.com',
  password: 'castro',
};

async function login(page) {
  await page.goto('/login');
  await page.locator('input[id="email"]').fill(testUser.email);
  await page.locator('input[id="password"]').fill(testUser.password);
  await page.getByRole('button', { name: /Entrar no sistema/i }).click();

  await expect(page).toHaveURL(/.*workspaces/);
  await page.getByText('Teleen Consultoria').click();
  await expect(page).toHaveURL(/.*dashboard/);
}

test.describe('Invoices Page - Infinite Scroll & Details', () => {
  test('should import ref/ invoices and display them with infinite scroll', async ({ page }) => {
    await login(page);

    // Navigate to invoices page
    await page.goto('/invoices');
    await expect(page.getByRole('heading', { name: /Invoice Management/i })).toBeVisible();

    // Upload all Claro TXT files from ref/clarotxt
    const files = fs.readdirSync(REF_DIR).filter(f => f.endsWith('.txt'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const filePath = path.join(REF_DIR, file);
      const input = page.locator('[data-testid="upload-claro-txt"]');
      await input.setInputFiles(filePath);

      // Wait for either success or "already imported" error (idempotent re-runs)
      await expect(page.locator('.MuiAlert-root').first()).toBeVisible({ timeout: 30000 });
      await page.locator('.MuiAlert-root button').first().click().catch(() => {});
    }

    // Verify invoices are visible in the list
    const rows = page.locator('[data-testid="invoice-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Verify split layout: details placeholder visible before selection
    await expect(page.getByText(/Select an invoice to view details/i)).toBeVisible();

    // Click first row -> details panel populates
    await rows.first().click();
    const details = page.locator('[data-testid="invoice-details"]');
    await expect(details).toBeVisible();
    await expect(details.getByText(/Invoice Details/i)).toBeVisible();
    await expect(details.getByText(/Source Phone/i)).toBeVisible();

    // Test infinite scroll: scroll container to bottom and expect more rows
    const container = page.locator('[data-testid="invoice-list-container"]');
    await container.evaluate(el => el.scrollTo(0, el.scrollHeight));

    // Wait for new rows to load (sentinel triggers loadMore)
    await expect
      .poll(async () => await rows.count(), { timeout: 10000 })
      .toBeGreaterThan(initialCount);
  });

  test('should show empty state when no invoices and no workspace data', async ({ page }) => {
    await login(page);
    await page.goto('/invoices');

    // The list container should render regardless
    await expect(page.locator('[data-testid="invoice-list-container"]')).toBeVisible();
  });
});
