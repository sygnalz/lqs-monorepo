#!/usr/bin/env node

/**
 * Phase 10 UAT Test Plan - Lead CRUD Functionality
 * Tests: UAT-LQS-P10-U-001 through UAT-LQS-P10-D-003
 * 
 * Comprehensive testing of Lead Management System:
 * - Authentication and Authorization 
 * - Lead Creation (POST /api/clients/:clientId/leads)
 * - Lead Retrieval (GET /api/clients/:clientId/leads) 
 * - Lead Updates (PATCH /api/leads/:leadId)
 * - Lead Deletion (DELETE /api/leads/:leadId)
 * - Lead Tag Management (POST/DELETE /api/leads/:leadId/tags)
 */

const BASE_URL = process.env.UAT_BASE_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev';

// Test Configuration
const testConfig = {
  baseUrl: BASE_URL,
  timeout: 30000,
  testUser: {
    email: `uat.test.${Date.now()}@lqs-testing.com`,
    password: 'UATTestPassword123!',
    name: 'UAT Test User',
    company_name: 'UAT Testing Corp'
  }
};

class UATTestRunner {
  constructor() {
    this.results = [];
    this.authToken = null;
    this.testUserId = null;
    this.testClientId = null;
    this.testLeadId = null;
    this.testTagId = null;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type}: ${message}`);
  }

  async executeTest(testCase, testFunction) {
    this.log(`Starting ${testCase}...`);
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const endTime = Date.now();
      
      this.results.push({
        testCase,
        status: 'PASS',
        duration: endTime - startTime,
        result: result
      });
      
      this.log(`✅ ${testCase} PASSED (${endTime - startTime}ms)`);
      return result;
    } catch (error) {
      this.results.push({
        testCase,
        status: 'FAIL',
        error: error.message,
        stack: error.stack
      });
      
      this.log(`❌ ${testCase} FAILED: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = `${testConfig.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (this.authToken) {
      options.headers.Authorization = `Bearer ${this.authToken}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    this.log(`${method} ${url}`);
    
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
    }

    return { status: response.status, data: responseData };
  }

  // UAT-LQS-P10-U-001: User Authentication and Setup
  async testAuthentication() {
    return await this.executeTest('UAT-LQS-P10-U-001', async () => {
      // Test Health Check
      const health = await this.makeRequest('GET', '/api/health');
      if (health.data.status !== 'ok') {
        throw new Error(`Health check failed: ${JSON.stringify(health.data)}`);
      }

      // Test User Registration
      const signupData = {
        email: testConfig.testUser.email,
        password: testConfig.testUser.password,
        companyName: testConfig.testUser.company_name,
        client_name: testConfig.testUser.name
      };

      const signup = await this.makeRequest('POST', '/api/auth/signup', signupData);
      if (!signup.data.success) {
        throw new Error('User registration failed');
      }

      // Test User Sign In
      const signinData = {
        email: testConfig.testUser.email,
        password: testConfig.testUser.password
      };

      const signin = await this.makeRequest('POST', '/api/auth/signin', signinData);
      if (!signin.data.success) {
        throw new Error(`User sign in failed: ${JSON.stringify(signin.data)}`);
      }
      
      if (!signin.data.data?.session?.access_token) {
        throw new Error(`No access token in sign in response: ${JSON.stringify(signin.data)}`);
      }

      this.authToken = signin.data.data.session.access_token;
      this.testUserId = signin.data.data.user.id;

      return {
        userId: this.testUserId,
        hasToken: !!this.authToken,
        tokenType: typeof this.authToken
      };
    });
  }

  // UAT-LQS-P10-U-002: Client Management and Setup
  async testClientManagement() {
    return await this.executeTest('UAT-LQS-P10-U-002', async () => {
      // Create Test Client
      const clientData = {
        name: 'UAT Test Client Corp',
        primary_contact_name: 'UAT Test Contact',
        primary_contact_email: `uat.client.${Date.now()}@lqs-testing.com`,
        primary_contact_phone: '+1-555-UAT-0001'
      };

      const createClient = await this.makeRequest('POST', '/api/clients', clientData);
      if (!createClient.data.success) {
        throw new Error('Client creation failed');
      }

      this.testClientId = createClient.data.data.id;

      // Verify Client Retrieval
      const getClient = await this.makeRequest('GET', `/api/clients/${this.testClientId}`);
      if (!getClient.data.success) {
        throw new Error('Client retrieval failed');
      }

      return {
        clientId: this.testClientId,
        clientName: createClient.data.data.name,
        retrievalSuccess: getClient.data.success
      };
    });
  }

  // UAT-LQS-P10-C-001: Lead Creation (CREATE)
  async testLeadCreation() {
    return await this.executeTest('UAT-LQS-P10-C-001', async () => {
      const leadData = {
        name: 'UAT Test Lead',
        email: `uat.lead.${Date.now()}@lqs-testing.com`,
        phone: '+1-555-UAT-LEAD',
        status: 'new',
        notes: 'This is a UAT test lead for Phase 10 testing'
      };

      const createLead = await this.makeRequest('POST', `/api/clients/${this.testClientId}/leads`, leadData);
      if (!createLead.data.success) {
        throw new Error('Lead creation failed');
      }

      this.testLeadId = createLead.data.data.id;

      // Verify lead data
      const createdLead = createLead.data.data;
      if (createdLead.name !== leadData.name || 
          createdLead.email !== leadData.email ||
          createdLead.client_id !== this.testClientId) {
        throw new Error('Lead data validation failed');
      }

      return {
        leadId: this.testLeadId,
        leadName: createdLead.name,
        leadEmail: createdLead.email,
        clientId: createdLead.client_id,
        status: createdLead.status
      };
    });
  }

  // UAT-LQS-P10-R-001: Lead Retrieval (READ)  
  async testLeadRetrieval() {
    return await this.executeTest('UAT-LQS-P10-R-001', async () => {
      // Test leads listing for client
      const getLeads = await this.makeRequest('GET', `/api/clients/${this.testClientId}/leads`);
      if (!getLeads.data.success) {
        throw new Error('Lead listing failed');
      }

      const leads = getLeads.data.data;
      if (!Array.isArray(leads) || leads.length === 0) {
        throw new Error('No leads found for client');
      }

      // Find our test lead
      const testLead = leads.find(lead => lead.id === this.testLeadId);
      if (!testLead) {
        throw new Error('Test lead not found in listing');
      }

      // Verify lead has required fields
      const requiredFields = ['id', 'name', 'email', 'client_id', 'created_at'];
      for (const field of requiredFields) {
        if (!testLead[field]) {
          throw new Error(`Lead missing required field: ${field}`);
        }
      }

      return {
        totalLeads: leads.length,
        testLeadFound: true,
        testLeadId: testLead.id,
        testLeadName: testLead.name,
        hasRequiredFields: true
      };
    });
  }

  // UAT-LQS-P10-U-003: Lead Updates (UPDATE)
  async testLeadUpdate() {
    return await this.executeTest('UAT-LQS-P10-U-003', async () => {
      const updateData = {
        name: 'UAT Updated Lead Name',
        email: `uat.updated.lead.${Date.now()}@lqs-testing.com`,
        phone: '+1-555-UPDATED',
        status: 'qualified',
        notes: 'Updated during Phase 10 UAT testing'
      };

      const updateLead = await this.makeRequest('PATCH', `/api/leads/${this.testLeadId}`, updateData);
      if (!updateLead.data.success) {
        throw new Error('Lead update failed');
      }

      const updatedLead = updateLead.data.data;
      
      // Verify all fields were updated
      if (updatedLead.name !== updateData.name ||
          updatedLead.email !== updateData.email ||
          updatedLead.phone !== updateData.phone ||
          updatedLead.status !== updateData.status ||
          updatedLead.notes !== updateData.notes) {
        throw new Error('Lead update validation failed');
      }

      // Test partial update
      const partialUpdate = { status: 'contacted' };
      const partialUpdateResult = await this.makeRequest('PATCH', `/api/leads/${this.testLeadId}`, partialUpdate);
      
      if (!partialUpdateResult.data.success || 
          partialUpdateResult.data.data.status !== 'contacted') {
        throw new Error('Partial lead update failed');
      }

      return {
        fullUpdateSuccess: true,
        partialUpdateSuccess: true,
        finalStatus: partialUpdateResult.data.data.status,
        updatedName: updatedLead.name
      };
    });
  }

  // UAT-LQS-P10-T-001: Tag Management
  async testTagManagement() {
    return await this.executeTest('UAT-LQS-P10-T-001', async () => {
      // Get available tags
      const getTags = await this.makeRequest('GET', '/api/tags');
      if (!getTags.data.success) {
        throw new Error('Tag retrieval failed');
      }

      const tags = getTags.data.data;
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error('No tags available for testing');
      }

      // Use first available tag
      this.testTagId = tags[0].id;
      const testTag = tags[0];

      // Apply tag to lead
      const applyTag = await this.makeRequest('POST', `/api/leads/${this.testLeadId}/tags`, {
        tag_id: this.testTagId
      });

      if (!applyTag.data.success) {
        throw new Error('Tag application failed');
      }

      // Verify tag was applied (check leads listing includes tags)
      const getLeadsWithTags = await this.makeRequest('GET', `/api/clients/${this.testClientId}/leads`);
      const leadWithTags = getLeadsWithTags.data.data.find(lead => lead.id === this.testLeadId);
      
      // Check if tags were applied (may be in different formats)
      const hasTags = leadWithTags.lead_tags && leadWithTags.lead_tags.length > 0;
      const hasTagsAlt = leadWithTags.tags && leadWithTags.tags.length > 0;
      
      if (!hasTags && !hasTagsAlt) {
        // Log the actual structure to understand the format
        console.log('Lead structure:', JSON.stringify(leadWithTags, null, 2));
        throw new Error('Tag was not applied to lead');
      }

      // Remove tag from lead
      const removeTag = await this.makeRequest('DELETE', `/api/leads/${this.testLeadId}/tags/${this.testTagId}`);
      if (removeTag.status !== 204) {
        throw new Error('Tag removal failed');
      }

      return {
        tagsAvailable: tags.length,
        testTagId: this.testTagId,
        testTagName: testTag.name,
        tagApplied: true,
        tagRemoved: true
      };
    });
  }

  // UAT-LQS-P10-D-001: Lead Deletion (DELETE)
  async testLeadDeletion() {
    return await this.executeTest('UAT-LQS-P10-D-001', async () => {
      // Delete the test lead
      const deleteLead = await this.makeRequest('DELETE', `/api/leads/${this.testLeadId}`);
      if (deleteLead.status !== 204) {
        throw new Error('Lead deletion failed - wrong status code');
      }

      // Verify lead no longer exists in listings
      const getLeadsAfterDelete = await this.makeRequest('GET', `/api/clients/${this.testClientId}/leads`);
      if (!getLeadsAfterDelete.data.success) {
        throw new Error('Lead listing after deletion failed');
      }

      const remainingLeads = getLeadsAfterDelete.data.data;
      const deletedLead = remainingLeads.find(lead => lead.id === this.testLeadId);
      
      if (deletedLead) {
        throw new Error('Lead still exists after deletion');
      }

      // Test attempting to update deleted lead (should fail)
      try {
        await this.makeRequest('PATCH', `/api/leads/${this.testLeadId}`, { name: 'Should Fail' });
        throw new Error('Update of deleted lead should have failed');
      } catch (error) {
        if (!error.message.includes('404')) {
          throw new Error('Deleted lead update should return 404');
        }
      }

      return {
        deletionStatus: 204,
        leadRemovedFromListing: true,
        updateAfterDeletionFails: true
      };
    });
  }

  // UAT-LQS-P10-S-001: Security and Authorization Tests
  async testSecurityAndAuthorization() {
    return await this.executeTest('UAT-LQS-P10-S-001', async () => {
      // Test unauthorized access (no token)
      const tempToken = this.authToken;
      this.authToken = null;

      try {
        await this.makeRequest('GET', `/api/clients/${this.testClientId}/leads`);
        throw new Error('Unauthorized request should have failed');
      } catch (error) {
        if (!error.message.includes('401')) {
          throw new Error('Unauthorized request should return 401');
        }
      }

      // Restore token
      this.authToken = tempToken;

      // Test access to non-existent lead
      try {
        await this.makeRequest('PATCH', '/api/leads/00000000-0000-0000-0000-000000000000', { name: 'Should Fail' });
        throw new Error('Access to non-existent lead should have failed');
      } catch (error) {
        if (!error.message.includes('404')) {
          throw new Error('Non-existent lead access should return 404');
        }
      }

      // Test invalid data validation
      try {
        await this.makeRequest('POST', `/api/clients/${this.testClientId}/leads`, {
          name: '', // Invalid empty name
          email: 'invalid-email' // Invalid email format
        });
        throw new Error('Invalid data validation should have failed');
      } catch (error) {
        if (!error.message.includes('400')) {
          throw new Error('Invalid data should return 400');
        }
      }

      return {
        unauthorizedAccessBlocked: true,
        nonExistentLeadAccessBlocked: true,
        dataValidationWorking: true
      };
    });
  }

  // Generate final UAT report
  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(80));
    console.log('                    PHASE 10 UAT COMPLETION REPORT');
    console.log('='.repeat(80));
    console.log(`Test Execution Date: ${new Date().toISOString()}`);
    console.log(`Environment: UAT (${testConfig.baseUrl})`);
    console.log(`Total Test Cases: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));

    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${status} ${result.testCase}${duration}`);
      
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('='.repeat(80));
    console.log('UAT Test Cases Coverage:');
    console.log('• UAT-LQS-P10-U-001: User Authentication and Setup');
    console.log('• UAT-LQS-P10-U-002: Client Management and Setup'); 
    console.log('• UAT-LQS-P10-C-001: Lead Creation (CREATE)');
    console.log('• UAT-LQS-P10-R-001: Lead Retrieval (READ)');
    console.log('• UAT-LQS-P10-U-003: Lead Updates (UPDATE)');
    console.log('• UAT-LQS-P10-T-001: Tag Management');
    console.log('• UAT-LQS-P10-D-001: Lead Deletion (DELETE)');
    console.log('• UAT-LQS-P10-S-001: Security and Authorization');
    console.log('='.repeat(80));

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results: this.results
    };
  }

  // Main UAT execution method
  async runAllTests() {
    console.log('🚀 Starting Phase 10 UAT Test Execution...');
    console.log(`Target Environment: ${testConfig.baseUrl}`);
    
    try {
      // Execute all test cases in sequence
      await this.testAuthentication();
      await this.testClientManagement(); 
      await this.testLeadCreation();
      await this.testLeadRetrieval();
      await this.testLeadUpdate();
      await this.testTagManagement();
      await this.testLeadDeletion();
      await this.testSecurityAndAuthorization();

      console.log('\n🎉 All Phase 10 UAT tests completed successfully!');
      
    } catch (error) {
      console.log(`\n💥 UAT execution stopped due to critical failure: ${error.message}`);
    }

    return this.generateReport();
  }
}

// Execute UAT when script is run directly
if (require.main === module) {
  const runner = new UATTestRunner();
  runner.runAllTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal UAT execution error:', error);
      process.exit(1);
    });
}

module.exports = UATTestRunner;