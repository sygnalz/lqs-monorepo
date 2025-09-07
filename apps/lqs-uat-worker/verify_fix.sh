#!/bin/bash
echo "🔍 Verifying Supabase RLS policy fix..."
echo

echo "Testing sign-up endpoint after RLS policy creation..."
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "final-test@gmail.com", "password": "TestPassword123!", "companyName": "Final Test LLC"}' \
  https://lqs-uat-worker.charlesheflin.workers.dev/api/auth/signup

echo
echo "✅ If you see HTTP 200/201 above, the RLS policy fix is successful!"
echo "❌ If you see HTTP 500 'Failed to create client record', the policy still needs to be created."
