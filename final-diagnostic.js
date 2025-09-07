#!/usr/bin/env node

import axios from 'axios';

// CODE RED: End-to-End Programmatic Authentication Lifecycle Diagnostic
console.log('='.repeat(80));
console.log('CODE RED: FINAL DIAGNOSTIC - USER LIFECYCLE RE-ENACTMENT');
console.log('='.repeat(80));
console.log('Testing Server: https://lqs-uat-worker.charlesheflin.workers.dev');
console.log('Timestamp:', new Date().toISOString());
console.log();

// Step A: Unique test credentials
const testCredentials = {
  companyName: 'Diagnostic Systems Inc',
  email: 'diag.test@example.com',
  password: 'KeystonePass2025!'
};

async function runDiagnostic() {
  console.log('STEP A: PROGRAMMATIC SIGNUP');
  console.log('-'.repeat(40));
  
  try {
    console.log('Request Payload:', JSON.stringify(testCredentials, null, 2));
    console.log('Making POST request to /api/auth/signup...');
    
    const signupResponse = await axios.post(
      'https://lqs-uat-worker.charlesheflin.workers.dev/api/auth/signup',
      testCredentials,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ SIGNUP SUCCESSFUL');
    console.log('Status Code:', signupResponse.status);
    console.log('Response Headers:', JSON.stringify(signupResponse.headers, null, 2));
    console.log('Response Body:', JSON.stringify(signupResponse.data, null, 2));
    console.log();
    
    // Step B: Immediate signin test
    console.log('STEP B: PROGRAMMATIC SIGN-IN');
    console.log('-'.repeat(40));
    
    const signinCredentials = {
      email: testCredentials.email,
      password: testCredentials.password
    };
    
    console.log('Request Payload:', JSON.stringify(signinCredentials, null, 2));
    console.log('Making POST request to /api/auth/signin...');
    
    const signinResponse = await axios.post(
      'https://lqs-uat-worker.charlesheflin.workers.dev/api/auth/signin',
      signinCredentials,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ SIGNIN SUCCESSFUL');
    console.log('Status Code:', signinResponse.status);
    console.log('Response Headers:', JSON.stringify(signinResponse.headers, null, 2));
    console.log('Response Body:', JSON.stringify(signinResponse.data, null, 2));
    
    console.log();
    console.log('='.repeat(80));
    console.log('🎉 DIAGNOSTIC COMPLETE: BOTH SIGNUP AND SIGNIN SUCCESSFUL');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.log('❌ ERROR OCCURRED');
    
    if (error.response) {
      // Server responded with error status
      console.log('Error Type: HTTP Response Error');
      console.log('Status Code:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Response Body:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request made but no response received
      console.log('Error Type: Network/Timeout Error');
      console.log('Request Details:', error.request);
    } else {
      // Something else happened
      console.log('Error Type: Request Setup Error');
      console.log('Error Message:', error.message);
    }
    
    console.log('Full Error Object:', JSON.stringify(error, null, 2));
    console.log();
    console.log('='.repeat(80));
    console.log('💥 DIAGNOSTIC FAILED: SEE ERROR DETAILS ABOVE');
    console.log('='.repeat(80));
    
    process.exit(1);
  }
}

// Execute the diagnostic
runDiagnostic().catch(console.error);