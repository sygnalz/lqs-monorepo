import { test, expect } from '@playwright/test';

const UAT_BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

const generateTestUser = () => ({
  email: `phase14-test-${Date.now()}@lqs-uat.com`,
  password: 'TestPassword123!',
  companyName: 'Phase 14 Test Company'
});

test.describe('Phase 14: Authentication Workflow E2E Tests', () => {
  test('complete authentication flow: sign-up → sign-in → dashboard', async ({ page }) => {
    const testUser = generateTestUser();
    
    console.log('🧪 Testing complete authentication flow...');
    console.log('👤 Test user:', { email: testUser.email, companyName: testUser.companyName });
    
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/signin/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
    console.log('✅ Step 1: Redirected to sign-in page');
    
    await page.click('text=create a new account');
    await expect(page).toHaveURL(/.*\/signup/);
    await expect(page.locator('h2')).toContainText('Create your account');
    console.log('✅ Step 2: Navigated to sign-up page');
    
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    console.log('✅ Step 3: Completed sign-up form');
    
    await expect(page).toHaveURL(/.*\/signin/);
    await expect(page.locator('.bg-green-100')).toContainText('Account created successfully');
    await expect(page.locator('input[name="email"]')).toHaveValue(testUser.email);
    console.log('✅ Step 4: Redirected to sign-in with success message');
    
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    console.log('✅ Step 5: Completed sign-in');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Client Management');
    await expect(page.locator('nav')).toContainText(`Logged in as: ${testUser.email}`);
    console.log('✅ Step 6: Successfully authenticated and redirected to dashboard');
    
    await page.click('text=Logout');
    await expect(page).toHaveURL(/.*\/signin/);
    console.log('✅ Step 7: Logout successful');
    
    console.log('🎉 Complete authentication flow test passed!');
  });

  test('protected route redirects unauthenticated users', async ({ page }) => {
    console.log('🔒 Testing protected route functionality...');
    
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/signin/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
    
    console.log('✅ Protected route correctly redirected to sign-in');
  });
});
