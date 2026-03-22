import { test, expect } from '@playwright/test';

test.describe('Nexflow Auth & Profile Flow', () => {
  // Use the default jedi user for testing
  const testUser = {
    email: 'gustavocastro73@gmail.com',
    password: 'castro',
    name: 'Gustavo Castro'
  };

  test('should login and navigate through profile tabs', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    
    // Check for the welcome text (translated)
    // "Bem-vindo - Teleen" or "Welcome - Teleen" or "Bienvenido - Teleen"
    // Since default is pt-BR:
    await expect(page.getByText(/Bem-vindo/i)).toBeVisible();

    await page.locator('input[id="email"]').fill(testUser.email);
    await page.locator('input[id="password"]').fill(testUser.password);
    await page.getByRole('button', { name: /Entrar no sistema/i }).click();

    // 2. Workspace Selection (if multiple, otherwise redirects to dashboard)
    // Based on check_db.js, we have 2 workspaces: "Teleen Consultoria" and "Nexflow Matriz"
    // So the selection page should appear.
    await expect(page).toHaveURL(/.*workspaces/);
    await expect(page.getByText(/Selecione o ambiente/i)).toBeVisible();
    
    // Select "Teleen Consultoria"
    await page.getByText('Teleen Consultoria').click();
    
    // 3. Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Workspace Ativo/i)).toBeVisible();
    await expect(page.getByText('Teleen Consultoria')).toBeVisible();

    // 4. Navigate to Profile
    // Open profile menu
    await page.locator('button').filter({ has: page.locator('.MuiAvatar-root') }).last().click();
    await page.getByRole('menuitem', { name: /Meu Perfil/i }).click();
    
    await expect(page).toHaveURL(/.*profile/);
    await expect(page.getByRole('heading', { name: /Configurações de Conta/i })).toBeVisible();

    // 5. Test Profile Tabs
    // Basic Info is active by default
    await expect(page.getByText(/Informações Básicas/i)).toBeVisible();
    await expect(page.locator('input[value="' + testUser.name + '"]')).toBeVisible();

    // Switch to Workspaces tab
    await page.getByRole('tab', { name: /Workspaces/i }).click();
    await expect(page.getByText(/Seus Ambientes de Trabalho/i)).toBeVisible();
    
    // Check for the new list format with selection circle for Jedi
    // activeWS should be the one selected earlier
    await expect(page.getByRole('button', { name: /Teleen Consultoria/i })).toBeVisible();
    await expect(page.getByText('ATIVO')).toBeVisible();

    // Switch to Administration Jedi tab
    await page.getByRole('tab', { name: /Administração Jedi/i }).click();
    await expect(page.getByText(/Gestão de Empresas/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Novo Workspace/i })).toBeVisible();
  });

  test('should fail login with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[id="email"]').fill('wrong@email.com');
    await page.locator('input[id="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /Entrar no sistema/i }).click();

    // Expect an error alert
    await expect(page.locator('.MuiAlert-root')).toBeVisible();
    await expect(page.getByText(/Erro ao realizar login/i)).toBeVisible();
  });

  test('should be able to toggle language', async ({ page }) => {
    await page.goto('/login');
    
    // Initial Pt-BR
    await expect(page.getByRole('button', { name: /Entrar no sistema/i })).toBeVisible();

    // Open language menu and switch to English
    await page.locator('button').filter({ has: page.locator('[data-testid="LanguageIcon"]') }).click();
    await page.getByText(/English/i).click();

    // Now it should be "Login to System"
    await expect(page.getByRole('button', { name: /Login to System/i })).toBeVisible();

    // Switch back to Spanish
    await page.locator('button').filter({ has: page.locator('[data-testid="LanguageIcon"]') }).click();
    await page.getByText(/Español/i).click();

    // Now it should be "Entrar al Sistema"
    await expect(page.getByRole('button', { name: /Entrar al Sistema/i })).toBeVisible();
  });
});
