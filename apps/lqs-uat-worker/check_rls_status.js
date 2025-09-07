import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kwebsccgtmntljdrzwet.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.TCcozM4eY4v21WlFIRHP7ytUqDhDY48bSYFkebuqYwY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔍 CHECKING TABLE AND RLS STATUS')
console.log('=================================')

// Test multiple possible table names
const tableNames = ['clients', 'client', 'public.clients']

for (const tableName of tableNames) {
  console.log(`\nTesting table: ${tableName}`)
  
  try {
    // Test SELECT first
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (selectError) {
      console.log(`  SELECT: ❌ ${selectError.message}`)
      continue
    } else {
      console.log(`  SELECT: ✅ Works (${selectData?.length || 0} records)`)
    }
    
    // Test INSERT
    const testData = { name: `Test ${new Date().getTime()}` }
    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .insert([testData])
      .select()
    
    if (insertError) {
      console.log(`  INSERT: ❌ ${insertError.code} - ${insertError.message}`)
    } else {
      console.log(`  INSERT: ✅ SUCCESS! Created:`, insertData[0])
      // Clean up the test record
      if (insertData[0]?.id) {
        await supabase.from(tableName).delete().eq('id', insertData[0].id)
        console.log(`  CLEANUP: Test record deleted`)
      }
    }
    
  } catch (err) {
    console.log(`  ERROR: ${err.message}`)
  }
}

console.log('\n=================================')
console.log('🎯 TABLE STATUS CHECK COMPLETE')
console.log('If all tables show INSERT errors, RLS disable command may not have taken effect.')
