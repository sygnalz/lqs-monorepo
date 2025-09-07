import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kwebsccgtmntljdrzwet.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.TCcozM4eY4v21WlFIRHP7ytUqDhDY48bSYFkebuqYwY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔍 Investigating Supabase clients table...')

// Test direct INSERT to see exact error
try {
  console.log('Testing direct INSERT on clients table...')
  const { data, error } = await supabase
    .from('clients')
    .insert([{ name: 'Test Company RLS Check' }])
    .select()

  if (error) {
    console.error('❌ INSERT Error:', error)
    console.error('Error Details:', JSON.stringify(error, null, 2))
  } else {
    console.log('✅ INSERT Success:', data)
  }
} catch (err) {
  console.error('❌ Exception during INSERT:', err)
}

// Check if we can query the table structure
try {
  console.log('\nChecking table accessibility...')
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ SELECT Error:', error)
  } else {
    console.log('✅ SELECT accessible, found', data?.length || 0, 'records')
  }
} catch (err) {
  console.error('❌ Exception during SELECT:', err)
}
