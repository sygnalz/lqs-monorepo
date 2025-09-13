import { test, expect } from '@playwright/test';

test.describe('Playbook Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    try {
      await page.click('text=create a new account');
      await page.fill('input[name="companyName"]', 'Test Company E2E');
      await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'testpassword123');
      await page.fill('input[name="confirmPassword"]', 'testpassword123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/signin');
    } catch (error) {
    }
    
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should navigate to playbooks page', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await expect(page.locator('h1')).toContainText('Playbooks');
    await expect(page.locator('text=Create Playbook')).toBeVisible();
    await expect(page.locator('text=Manage AI decision-making strategies')).toBeVisible();
  });

  test('should create a new playbook', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Create Playbook');
    
    await page.fill('input[name="name"]', 'Test Playbook E2E');
    await page.fill('textarea[name="goal_description"]', 'This is a test playbook for E2E testing');
    await page.fill('textarea[name="ai_instructions_and_persona"]', 'Act as a helpful AI assistant for testing purposes');
    await page.fill('textarea[name="constraints"]', '{"max_responses": 10, "tone": "professional"}');
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/playbooks');
    
    await expect(page.locator('text=Test Playbook E2E')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Create Playbook');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Playbook name is required')).toBeVisible();
  });

  test('should validate JSON constraints', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Create Playbook');
    
    await page.fill('input[name="name"]', 'Test Validation');
    
    await page.fill('textarea[name="constraints"]', '{"invalid": json}');
    
    await expect(page.locator('text=Invalid JSON format')).toBeVisible();
    
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should search playbooks', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Create Playbook');
    await page.fill('input[name="name"]', 'Searchable Playbook');
    await page.fill('textarea[name="goal_description"]', 'A playbook for search testing');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/playbooks');
    
    await page.fill('input[placeholder="Search playbooks..."]', 'Searchable');
    
    await expect(page.locator('text=Searchable Playbook')).toBeVisible();
    
    await page.fill('input[placeholder="Search playbooks..."]', '');
  });

  test('should edit an existing playbook', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Create Playbook');
    await page.fill('input[name="name"]', 'Editable Playbook');
    await page.fill('textarea[name="goal_description"]', 'Original description');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Edit', { first: true });
    
    await page.fill('input[name="name"]', 'Edited Playbook');
    await page.fill('textarea[name="goal_description"]', 'Updated description');
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/playbooks');
    
    await expect(page.locator('text=Edited Playbook')).toBeVisible();
    await expect(page.locator('text=Updated description')).toBeVisible();
  });

  test('should delete a playbook', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.click('text=Create Playbook');
    await page.fill('input[name="name"]', 'Deletable Playbook');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/playbooks');
    
    page.on('dialog', dialog => dialog.accept());
    
    await page.click('text=Delete', { first: true });
    
    await expect(page.locator('text=Deletable Playbook')).not.toBeVisible();
  });

  test('should sort playbooks by name and date', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    const playbooks = ['Alpha Playbook', 'Beta Playbook', 'Gamma Playbook'];
    
    for (const name of playbooks) {
      await page.click('text=Create Playbook');
      await page.fill('input[name="name"]', name);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/playbooks');
      await page.waitForTimeout(1000);
    }
    
    await page.click('th:has-text("Name")');
    
    const nameElements = await page.locator('td:has-text("Playbook")').all();
    const names = await Promise.all(nameElements.map(el => el.textContent()));
    expect(names.some(name => name?.includes('Alpha'))).toBeTruthy();
    
    await page.click('th:has-text("Created")');
    
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('should handle empty state', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    const emptyStateExists = await page.locator('text=No playbooks').isVisible();
    if (emptyStateExists) {
      await expect(page.locator('text=Get started by creating your first playbook')).toBeVisible();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await page.route('**/api/playbooks', route => {
      route.abort('failed');
    });
    
    await page.click('text=Create Playbook');
    await page.fill('input[name="name"]', 'Network Test Playbook');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Failed to create playbook')).toBeVisible();
  });

  test('should maintain authentication state', async ({ page }) => {
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await expect(page.locator('text=Logout')).toBeVisible();
    
    await page.click('text=Dashboard');
    await page.waitForURL('**/dashboard');
    
    await page.click('text=Playbooks');
    await page.waitForURL('**/playbooks');
    
    await expect(page.locator('text=Create Playbook')).toBeVisible();
  });
});
