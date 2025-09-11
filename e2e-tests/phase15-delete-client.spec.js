import { test, expect } from '@playwright/test';

const UAT_BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

const generateTestUser = () => ({
  email: `phase15-test-${Date.now()}@lqs-uat.com`,
  password: 'TestPassword123!',
  companyName: 'Phase 15 Test Company'
});

test.describe('Phase 15: Delete Client E2E Tests', () => {
  test('complete delete client workflow: create → view → delete → verify removal', async ({ page }) => {
    const testUser = generateTestUser();
    
    console.log('🧪 Testing complete delete client workflow...');
    console.log('👤 Test user:', { email: testUser.email, companyName: testUser.companyName });
    
    await page.goto(`${UAT_BASE_URL}/signup`);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/signin/, { timeout: 10000 });
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
    console.log('✅ Step 1: Successfully signed up and signed in');
    
    await page.click('text=Add New Client');
    await expect(page).toHaveURL(/.*\/clients\/new/);
    
    const testClientName = `Test Client ${Date.now()}`;
    await page.fill('input[name="name"]', testClientName);
    await page.fill('input[name="primary_contact_name"]', 'John Doe');
    await page.fill('input[name="primary_contact_email"]', 'john@testclient.com');
    await page.fill('input[name="primary_contact_phone"]', '+1555TEST01');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
    console.log('✅ Step 2: Successfully created test client');
    
    const initialClientCount = await page.locator('tbody tr').count();
    console.log(`📊 Initial client count: ${initialClientCount}`);
    
    await page.click(`text=${testClientName}`);
    await expect(page).toHaveURL(/.*\/clients\/[^\/]+$/);
    await expect(page.locator('h1')).toContainText('Client Details');
    console.log('✅ Step 3: Navigated to client detail page');
    
    await expect(page.locator('button:has-text("Delete Client")')).toBeVisible();
    console.log('✅ Step 4: Delete button is visible');
    
    await page.click('button:has-text("Delete Client")');
    await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();
    await expect(page.locator(`text="${testClientName}"`)).toBeVisible();
    await expect(page.locator('text=This will permanently delete the client and all associated leads')).toBeVisible();
    console.log('✅ Step 5: Delete confirmation modal appeared with correct warning');
    
    await page.evaluate(() => {
      const cancelButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Cancel');
      if (cancelButton) cancelButton.click();
    });
    await expect(page.locator('text=Are you sure you want to delete')).not.toBeVisible();
    console.log('✅ Step 6: Cancel button works correctly');
    
    await page.click('button:has-text("Delete Client")');
    
    await page.waitForSelector('.fixed button:has-text("Delete")', { timeout: 5000 });
    await page.click('.fixed button:has-text("Delete")');
    console.log('✅ Step 7: Confirmed client deletion via Playwright native click');
    
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    console.log('✅ Step 8: Successfully redirected to dashboard after deletion');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const finalClientCount = await page.locator('tbody tr').count();
    console.log(`📊 Final client count: ${finalClientCount}`);
    
    expect(finalClientCount).toBe(initialClientCount - 1);
    console.log('✅ Step 9: Client count decreased by 1, confirming deletion');
    
    await expect(page.locator(`text=${testClientName}`)).not.toBeVisible();
    console.log('✅ Step 10: Deleted client no longer appears in dashboard list');
    
    const remainingClients = await page.locator('tbody tr').allTextContents();
    const clientStillExists = remainingClients.some(text => text.includes(testClientName));
    expect(clientStillExists).toBe(false);
    console.log('✅ Step 11: Strict verification - deleted client completely removed from data');
    
    console.log('🎉 Complete delete client workflow test passed with strict assertions!');
  });

  test('delete button not visible in edit mode', async ({ page }) => {
    const testUser = generateTestUser();
    
    console.log('🧪 Testing delete button visibility in edit mode...');
    
    await page.goto(`${UAT_BASE_URL}/signup`);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/signin/, { timeout: 10000 });
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Add New Client');
    const testClientName = `Test Client ${Date.now()}`;
    await page.fill('input[name="name"]', testClientName);
    await page.fill('input[name="primary_contact_name"]', 'John Doe');
    await page.fill('input[name="primary_contact_email"]', 'john@testclient.com');
    await page.click('button[type="submit"]');
    
    await page.click(`text=${testClientName}`);
    
    await expect(page.locator('button:has-text("Delete Client")')).toBeVisible();
    console.log('✅ Delete button visible in view mode');
    
    await page.click('button:has-text("Edit Client")');
    await expect(page.locator('button:has-text("Delete Client")')).not.toBeVisible();
    console.log('✅ Delete button correctly hidden in edit mode');
    
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('button:has-text("Delete Client")')).toBeVisible();
    console.log('✅ Delete button visible again after canceling edit mode');
  });
});
