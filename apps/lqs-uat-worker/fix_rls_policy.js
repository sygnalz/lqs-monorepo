import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kwebsccgtmntljdrzwet.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.TCcozM4eY4v21WlFIRHP7ytUqDhDY48bSYFkebuqYwY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔧 Attempting to create RLS policy for clients table...')

// Try to create the policy using SQL
try {
  console.log('Creating INSERT policy for public sign-up...')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY "Allow public insert for new clients" ON public.clients
      FOR INSERT
      WITH CHECK (true);
    `
  })

  if (error) {
    console.error('❌ Policy Creation Error:', error)
    console.log('\n📝 Manual SQL needed:')
    console.log('Please execute this SQL in Supabase SQL Editor:')
    console.log(`
CREATE POLICY "Allow public insert for new clients" ON public.clients
FOR INSERT  
WITH CHECK (true);
    `)
  } else {
    console.log('✅ Policy created successfully:', data)
  }
} catch (err) {
  console.error('❌ Exception:', err)
  console.log('\n📝 Alternative approach needed - manual policy creation required')
}

// Test if we can now insert
try {
  console.log('\nTesting INSERT after policy creation...')
  const { data, error } = await supabase
    .from('clients')
    .insert([{ name: 'RLS Policy Test Company' }])
    .select()

  if (error) {
    console.error('❌ INSERT still failing:', error.message)
  } else {
    console.log('✅ INSERT now working!', data)
  }
} catch (err) {
  console.error('❌ Test INSERT failed:', err)
}
