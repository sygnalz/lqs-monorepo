import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kwebsccgtmntljdrzwet.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.TCcozM4eY4v21WlFIRHP7ytUqDhDY48bSYFkebuqYwY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔍 COMPREHENSIVE RLS DIAGNOSTIC')
console.log('================================')

// 1. Test table existence and basic permissions
console.log('\n1. Testing table accessibility...')
try {
  const { data, error, count } = await supabase
    .from('clients')
    .select('*', { count: 'exact' })
  
  if (error) {
    console.error('❌ SELECT Error:', error.message)
  } else {
    console.log('✅ SELECT works - Table accessible')
    console.log(`   Records found: ${count}`)
    if (data && data.length > 0) {
      console.log('   Sample record:', data[0])
    }
  }
} catch (err) {
  console.error('❌ SELECT Exception:', err.message)
}

// 2. Test INSERT with minimal data
console.log('\n2. Testing INSERT operation...')
try {
  const testData = { name: `RLS Test ${new Date().toISOString()}` }
  console.log('   Attempting INSERT with data:', testData)
  
  const { data, error } = await supabase
    .from('clients')
    .insert([testData])
    .select()

  if (error) {
    console.error('❌ INSERT Error Details:')
    console.error('   Code:', error.code)
    console.error('   Message:', error.message)
    console.error('   Details:', error.details)
    console.error('   Hint:', error.hint)
    
    // Check if it's specifically RLS related
    if (error.code === '42501') {
      console.log('\n   🚨 CONFIRMED: RLS Policy Blocking INSERT')
      console.log('   The policy "Allow public insert for new clients" is either:')
      console.log('   - Not created successfully')
      console.log('   - Overridden by another restrictive policy')
      console.log('   - Not applying to the anon role correctly')
    }
  } else {
    console.log('✅ INSERT SUCCESS!')
    console.log('   Created record:', data)
  }
} catch (err) {
  console.error('❌ INSERT Exception:', err.message)
}

// 3. Test different table to see if RLS is working elsewhere
console.log('\n3. Testing other table access (profiles)...')
try {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Profiles table error:', error.message)
  } else {
    console.log('✅ Profiles table accessible')
  }
} catch (err) {
  console.error('❌ Profiles Exception:', err.message)
}

console.log('\n================================')
console.log('🎯 DIAGNOSTIC COMPLETE')
console.log('If INSERT still fails with code 42501, the RLS policy needs manual verification in Supabase dashboard.')
