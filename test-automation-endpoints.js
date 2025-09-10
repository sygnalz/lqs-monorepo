const axios = require('axios');

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

async function testAutomationEndpoints() {
  console.log('🧪 Testing Automation Endpoints...\n');

  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  console.log('\n📋 Automation endpoints to test:');
  console.log('- POST /api/leads/:id/pause');
  console.log('- POST /api/leads/:id/resume');
  console.log('- POST /api/leads/:id/review-bin');
  console.log('- POST /api/leads/bulk-action');
  console.log('\n⚠️  Note: These endpoints require authentication and valid lead IDs');
  console.log('   Run this script with proper auth tokens to test functionality');
}

testAutomationEndpoints();
