import { test, expect } from '@playwright/test';

const UAT_BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

const generateTestUser = (companyName) => ({
  email: `security-test-${Date.now()}-${Math.random().toString(36).substring(7)}@lqs-uat.com`,
  password: 'TestPassword123!',
  companyName: companyName
});

test.describe('Multi-Tenant Security: GET /api/clients Isolation', () => {
  test('users can only see clients from their own company', async ({ request }) => {
    console.log('🔒 Testing multi-tenant security for GET /api/clients endpoint...');
    
    const user1 = generateTestUser('Company Alpha');
    const user2 = generateTestUser('Company Beta');
    
    console.log('👤 User 1:', { email: user1.email, company: user1.companyName });
    console.log('👤 User 2:', { email: user2.email, company: user2.companyName });
    
    console.log('📝 Step 1: Creating User 1...');
    const signup1Response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
      data: {
        email: user1.email,
        password: user1.password,
        companyName: user1.companyName
      }
    });
    expect(signup1Response.ok()).toBeTruthy();
    
    const signin1Response = await request.post(`${API_BASE_URL}/api/auth/signin`, {
      data: {
        email: user1.email,
        password: user1.password
      }
    });
    expect(signin1Response.ok()).toBeTruthy();
    const signin1Data = await signin1Response.json();
    const user1Token = signin1Data.data.session.access_token;
    console.log('✅ User 1 created and authenticated');
    
    console.log('📝 Step 2: Creating User 2...');
    const signup2Response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
      data: {
        email: user2.email,
        password: user2.password,
        companyName: user2.companyName
      }
    });
    expect(signup2Response.ok()).toBeTruthy();
    
    const signin2Response = await request.post(`${API_BASE_URL}/api/auth/signin`, {
      data: {
        email: user2.email,
        password: user2.password
      }
    });
    expect(signin2Response.ok()).toBeTruthy();
    const signin2Data = await signin2Response.json();
    const user2Token = signin2Data.data.session.access_token;
    console.log('✅ User 2 created and authenticated');
    
    console.log('🏢 Step 3: Creating client for User 1...');
    const user1ClientName = `User1 Client ${Date.now()}`;
    const client1Response = await request.post(`${API_BASE_URL}/api/clients`, {
      data: {
        name: user1ClientName,
        primary_contact_name: 'User 1 Contact',
        primary_contact_email: 'user1@company-alpha.com',
        primary_contact_phone: '+1555USER001'
      },
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });
    expect(client1Response.ok()).toBeTruthy();
    const client1Data = await client1Response.json();
    const user1ClientId = client1Data.data.id;
    console.log(`✅ User 1 client created: ${user1ClientName} (ID: ${user1ClientId})`);
    
    console.log('🏢 Step 4: Creating client for User 2...');
    const user2ClientName = `User2 Client ${Date.now()}`;
    const client2Response = await request.post(`${API_BASE_URL}/api/clients`, {
      data: {
        name: user2ClientName,
        primary_contact_name: 'User 2 Contact',
        primary_contact_email: 'user2@company-beta.com',
        primary_contact_phone: '+1555USER002'
      },
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    });
    expect(client2Response.ok()).toBeTruthy();
    const client2Data = await client2Response.json();
    const user2ClientId = client2Data.data.id;
    console.log(`✅ User 2 client created: ${user2ClientName} (ID: ${user2ClientId})`);
    
    console.log('🔍 Step 5: Testing User 1 can only see their own client...');
    const user1ClientsResponse = await request.get(`${API_BASE_URL}/api/clients`, {
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });
    expect(user1ClientsResponse.ok()).toBeTruthy();
    const user1ClientsData = await user1ClientsResponse.json();
    
    console.log(`📊 User 1 sees ${user1ClientsData.data.length} client(s)`);
    
    expect(user1ClientsData.data.length).toBe(1);
    expect(user1ClientsData.data[0].id).toBe(user1ClientId);
    expect(user1ClientsData.data[0].name).toBe(user1ClientName);
    
    const user1SeesUser2Client = user1ClientsData.data.some(client => client.id === user2ClientId);
    expect(user1SeesUser2Client).toBe(false);
    
    console.log('✅ User 1 correctly sees only their own client');
    
    console.log('🔍 Step 6: Testing User 2 can only see their own client...');
    const user2ClientsResponse = await request.get(`${API_BASE_URL}/api/clients`, {
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    });
    expect(user2ClientsResponse.ok()).toBeTruthy();
    const user2ClientsData = await user2ClientsResponse.json();
    
    console.log(`📊 User 2 sees ${user2ClientsData.data.length} client(s)`);
    
    expect(user2ClientsData.data.length).toBe(1);
    expect(user2ClientsData.data[0].id).toBe(user2ClientId);
    expect(user2ClientsData.data[0].name).toBe(user2ClientName);
    
    const user2SeesUser1Client = user2ClientsData.data.some(client => client.id === user1ClientId);
    expect(user2SeesUser1Client).toBe(false);
    
    console.log('✅ User 2 correctly sees only their own client');
    
    console.log('🔒 Step 7: Final verification of multi-tenant isolation...');
    expect(user1ClientId).not.toBe(user2ClientId);
    expect(user1ClientName).not.toBe(user2ClientName);
    
    console.log('🎉 Multi-tenant security test passed!');
    console.log('✅ Summary:');
    console.log(`   - User 1 (${user1.companyName}) sees 1 client: ${user1ClientName}`);
    console.log(`   - User 2 (${user2.companyName}) sees 1 client: ${user2ClientName}`);
    console.log('   - No cross-company data leakage detected');
    console.log('   - GET /api/clients endpoint properly filters by company_id');
  });
});
