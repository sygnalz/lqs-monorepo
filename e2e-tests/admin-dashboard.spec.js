// e2e-tests/admin-dashboard.spec.js
import { test, expect } from '@playwright/test';

/**
 * Phase 12 E2E Test Suite - Admin Dashboard Workflow Verification
 * 
 * This E2E test validates the complete Admin Dashboard workflow per [CD-014] directive.
 * 
 * Test Requirements:
 * 1. Log in successfully
 * 2. Navigate to the new /admin dashboard route
 * 3. Assert that the prospect table is visible and contains data rows
 * 4. Assert that the required columns are present
 * 5. Click on the first prospect's name in the list
 * 6. Assert that the page navigates to the correct /prospect/{prospectId} URL
 */

const UAT_BASE_URL = 'https://40c2cc9f.lqs-p12-uat.pages.dev';
const API_BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

// Test credentials
const TEST_USER = {
  email: `admin_test_${Date.now()}@lqs-uat.com`,
  password: 'AdminTest123!',
  companyName: `Admin Test Company ${Date.now()}`
};

test.describe('Phase 12: Admin Dashboard E2E Workflow Verification', () => {
  let authToken = null;
  let testClientId = null;
  let testLeadId = null;
  
  test.beforeAll(async ({ request }) => {
    console.log('🔧 [ADMIN E2E] Setting up test data for Admin Dashboard...');
    
    // Create test user
    console.log(`📝 Creating test user: ${TEST_USER.email}`);
    const signupResponse = await request.post(`${API_BASE_URL}/api/auth/signup`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
        companyName: TEST_USER.companyName
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(signupResponse.ok()).toBeTruthy();
    
    // Sign in to get auth token
    console.log('🔐 Obtaining auth token...');
    const signinResponse = await request.post(`${API_BASE_URL}/api/auth/signin`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(signinResponse.ok()).toBeTruthy();
    const signinData = await signinResponse.json();
    authToken = signinData.data.session.access_token;
    console.log('✅ Auth token obtained');
    
    // Create test client (agent)
    console.log('🏢 Creating test agent/client...');
    const clientResponse = await request.post(`${API_BASE_URL}/api/clients`, {
      data: {
        name: `Admin Test Agent ${Date.now()}`,
        primary_contact_name: 'Admin Test Contact',
        primary_contact_email: 'admin.test@agent.com',
        primary_contact_phone: '+1555ADMIN01'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(clientResponse.ok()).toBeTruthy();
    const clientData = await clientResponse.json();
    testClientId = clientData.data.id;
    console.log(`✅ Test agent/client created: ${testClientId}`);
    
    // Create multiple test prospects (leads) for the agent
    console.log('📝 Creating test prospects/leads...');
    
    const prospects = [
      {
        name: `Admin Test Prospect 1 ${Date.now()}`,
        email: `prospect1.${Date.now()}@test.com`,
        phone: '+1555PROS001',
        status: 'new'
      },
      {
        name: `Admin Test Prospect 2 ${Date.now()}`,
        email: `prospect2.${Date.now()}@test.com`, 
        phone: '+1555PROS002',
        status: 'contacted'
      },
      {
        name: `Admin Test Prospect 3 ${Date.now()}`,
        email: `prospect3.${Date.now()}@test.com`,
        phone: '+1555PROS003', 
        status: 'qualified'
      }
    ];
    
    for (const prospect of prospects) {
      const leadResponse = await request.post(`${API_BASE_URL}/api/clients/${testClientId}/leads`, {
        data: prospect,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(leadResponse.ok()).toBeTruthy();
      
      if (!testLeadId) {
        const leadData = await leadResponse.json();
        testLeadId = leadData.data.id;
      }
    }
    
    console.log(`✅ Test prospects created. First prospect ID: ${testLeadId}`);
    console.log('🎯 Test data setup complete for Admin Dashboard E2E test');
  });

  test('Complete Admin Dashboard Workflow: Login → Admin Route → Prospect Table → Navigation', async ({ page }) => {
    console.log('🚀 [ADMIN E2E] Starting Admin Dashboard E2E Workflow Test...');
    console.log(`📍 Target UAT URL: ${UAT_BASE_URL}`);
    console.log(`🎯 Test User: ${TEST_USER.email}`);
    console.log(`🏢 Test Agent ID: ${testClientId}`);
    console.log(`📝 Test Prospect ID: ${testLeadId}`);
    
    // STEP 1: Navigate to UAT URL and log in successfully
    console.log('🌐 STEP 1: Navigate to UAT and log in successfully');
    await page.goto('/');
    await page.screenshot({ path: 'admin-step1-homepage.png', fullPage: true });
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name="password"]').first();
    const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();
    
    // Fill login form
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await page.screenshot({ path: 'admin-step1-before-login.png', fullPage: true });
    
    // Click login button
    await loginButton.click();
    await page.waitForTimeout(3000);
    
    // Verify login success
    const isLoggedIn = await page.locator('text=/client|dashboard|leads|logout/i').first().isVisible({ timeout: 10000 });
    expect(isLoggedIn).toBeTruthy();
    
    console.log('✅ STEP 1 COMPLETE: Login successful');
    await page.screenshot({ path: 'admin-step1-after-login.png', fullPage: true });
    
    // STEP 2: Navigate to the new /admin dashboard route
    console.log('📋 STEP 2: Navigate to the /admin dashboard route');
    
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'admin-step2-dashboard.png', fullPage: true });
    
    // Verify we're on the admin dashboard page
    const adminDashboardTitle = await page.locator('text=/Admin Dashboard.*Prospect Management/i').first().isVisible({ timeout: 10000 });
    expect(adminDashboardTitle).toBeTruthy();
    
    console.log('✅ STEP 2 COMPLETE: Successfully navigated to /admin route');
    
    // STEP 3: Assert that the prospect table is visible and contains data rows
    console.log('📊 STEP 3: Verify prospect table is visible and contains data rows');
    
    // Wait for table to load
    await page.waitForTimeout(2000);
    
    // Check for prospect table
    const prospectTable = await page.locator('table').first().isVisible({ timeout: 15000 });
    expect(prospectTable).toBeTruthy();
    console.log('✅ Prospect table is visible');
    
    // Check for data rows (tbody with tr elements)
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);
    console.log(`✅ Prospect table contains ${tableRows} data rows`);
    
    console.log('✅ STEP 3 COMPLETE: Prospect table visible with data');
    
    // STEP 4: Assert that the required columns are present
    console.log('🏷️  STEP 4: Verify required columns are present');
    
    const requiredColumns = ['Full Name', 'Phone Number', 'Status Badge', 'Created Date', 'Last Action', 'Next Action'];
    
    for (const columnName of requiredColumns) {
      const columnHeader = await page.locator('th', { hasText: columnName }).first().isVisible({ timeout: 5000 });
      expect(columnHeader).toBeTruthy();
      console.log(`✅ Column found: "${columnName}"`);
    }
    
    console.log('✅ STEP 4 COMPLETE: All required columns present');
    await page.screenshot({ path: 'admin-step4-table-columns.png', fullPage: true });
    
    // STEP 5: Click on the first prospect's name in the list
    console.log('👆 STEP 5: Click on first prospect name in the list');
    
    // Find the first prospect name link in the table
    const firstProspectLink = await page.locator('tbody tr:first-child td:first-child button').first();
    expect(await firstProspectLink.isVisible()).toBeTruthy();
    
    const prospectName = await firstProspectLink.textContent();
    console.log(`🎯 First prospect name: "${prospectName}"`);
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'admin-step5-before-click.png', fullPage: true });
    
    // Click on the first prospect name
    await firstProspectLink.click();
    await page.waitForTimeout(2000);
    
    console.log('✅ STEP 5 COMPLETE: Clicked on first prospect name');
    
    // STEP 6: Assert that the page navigates to the correct /prospect/{prospectId} URL
    console.log('🔍 STEP 6: Verify navigation to correct /prospect/{prospectId} URL');
    
    // Check the current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Verify URL matches the pattern /prospect/{prospectId}
    const prospectUrlPattern = /\/prospect\/[a-f0-9-]+$/;
    expect(currentUrl).toMatch(prospectUrlPattern);
    
    // Extract prospect ID from URL
    const urlParts = currentUrl.split('/');
    const prospectIdFromUrl = urlParts[urlParts.length - 1];
    console.log(`🆔 Prospect ID from URL: ${prospectIdFromUrl}`);
    
    // Verify the prospect detail page loaded
    const prospectDetailTitle = await page.locator('text=/Prospect Detail/i').first().isVisible({ timeout: 10000 });
    expect(prospectDetailTitle).toBeTruthy();
    
    // Verify the prospect ID is displayed on the page
    const prospectIdDisplay = await page.locator(`text="${prospectIdFromUrl}"`).first().isVisible({ timeout: 5000 });
    expect(prospectIdDisplay).toBeTruthy();
    
    console.log('✅ STEP 6 COMPLETE: Successfully navigated to prospect detail page');
    await page.screenshot({ path: 'admin-step6-prospect-detail.png', fullPage: true });
    
    // FINAL VERIFICATION: Test the back navigation
    console.log('🔄 FINAL: Test back navigation to admin dashboard');
    
    const backButton = await page.locator('button:has-text("Back to Admin Dashboard"), button:has-text("Return to Admin Dashboard")').first();
    if (await backButton.isVisible({ timeout: 5000 })) {
      await backButton.click();
      await page.waitForTimeout(2000);
      
      // Verify we're back on admin dashboard
      const backOnAdmin = await page.locator('text=/Admin Dashboard.*Prospect Management/i').first().isVisible({ timeout: 10000 });
      expect(backOnAdmin).toBeTruthy();
      console.log('✅ Back navigation working correctly');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'admin-final-success.png', fullPage: true });
    
    console.log('🎉 ADMIN DASHBOARD E2E TEST COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('✅ Summary of completed steps:');
    console.log('   1. ✅ Logged in successfully');
    console.log('   2. ✅ Navigated to /admin dashboard route');  
    console.log('   3. ✅ Verified prospect table is visible with data rows');
    console.log('   4. ✅ Verified all required columns are present');
    console.log('   5. ✅ Clicked on first prospect name');
    console.log('   6. ✅ Verified navigation to correct /prospect/{prospectId} URL');
    console.log('');
    console.log('🎯 Admin Dashboard workflow verification COMPLETE!');
  });

  test('Admin Dashboard API Integration Verification', async ({ request }) => {
    console.log('🔧 [API VERIFICATION] Testing Admin Dashboard API integration...');
    
    // Verify the admin can fetch clients (agents)
    console.log('🏢 Testing GET /api/clients for admin dashboard');
    
    const clientsResponse = await request.get(`${API_BASE_URL}/api/clients`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(clientsResponse.ok()).toBeTruthy();
    const clientsData = await clientsResponse.json();
    
    console.log(`✅ Clients API working - returned ${clientsData.data.length} clients`);
    
    // Verify the admin can fetch prospects for the first client
    console.log(`📝 Testing GET /api/clients/${testClientId}/leads for admin dashboard`);
    
    const leadsResponse = await request.get(`${API_BASE_URL}/api/clients/${testClientId}/leads`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(leadsResponse.ok()).toBeTruthy();
    const leadsData = await leadsResponse.json();
    
    console.log(`✅ Leads API working - returned ${leadsData.data.length} prospects`);
    
    // Verify prospect data structure
    const firstLead = leadsData.data[0];
    expect(firstLead).toHaveProperty('id');
    expect(firstLead).toHaveProperty('name');
    expect(firstLead).toHaveProperty('phone');
    expect(firstLead).toHaveProperty('status');
    expect(firstLead).toHaveProperty('created_at');
    
    console.log('✅ Prospect data structure validation complete');
    console.log('🎉 Admin Dashboard API integration verified!');
  });

  test('should display automation controls', async ({ page }) => {
    console.log('🧪 Testing automation controls...');
    
    // STEP 1: Navigate to UAT URL and log in successfully
    console.log('🌐 STEP 1: Navigate to UAT and log in successfully');
    await page.goto('/');
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i], input[name="password"]').first();
    const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();
    
    // Fill login form
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    
    // Click login button
    await loginButton.click();
    await page.waitForTimeout(3000);
    
    // Verify login success
    const isLoggedIn = await page.locator('text=/client|dashboard|leads|logout/i').first().isVisible({ timeout: 10000 });
    expect(isLoggedIn).toBeTruthy();
    console.log('✅ STEP 1 COMPLETE: Login successful');
    
    // STEP 2: Navigate to admin dashboard
    console.log('📋 STEP 2: Navigate to the /admin dashboard route');
    await page.goto('/admin');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Admin Dashboard")', { timeout: 10000 });
    
    // Check for bulk selection checkbox in header
    await expect(page.locator('thead input[type="checkbox"]')).toBeVisible();
    
    // Check for individual checkboxes in rows (if prospects exist)
    const prospectRows = await page.locator('tbody tr').count();
    if (prospectRows > 0) {
      await expect(page.locator('tbody tr:first-child input[type="checkbox"]')).toBeVisible();
      
      // Check for kebab menu (three dots) in first row
      await expect(page.locator('tbody tr:first-child svg')).toBeVisible();
      
      await page.locator('tbody tr:first-child input[type="checkbox"]').click();
      
      await expect(page.locator('text=selected')).toBeVisible();
      await expect(page.locator('button:has-text("Bulk Actions")')).toBeVisible();
    }
    
    console.log('✅ Automation controls test completed successfully');
  });
});
