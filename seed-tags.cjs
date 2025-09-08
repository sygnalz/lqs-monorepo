/**
 * seed-tags.cjs - One-time script to programmatically seed the tags table
 * 
 * This script reads the PROSPECT STATE TAGS CSV file and populates the Supabase
 * tags table with hierarchical tag definitions for the lead tagging system.
 * 
 * CRITICAL: This script requires manual environment variable setup:
 * - SUPABASE_URL: The Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: The service role key (not anon key)
 * 
 * Usage: node seed-tags.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_FILE_PATH = 'PROSPECT STATE TAGS - real_estate_conversation_master_tag_guide (1).csv';

// Validation
if (!SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

console.log('🚀 Starting tags table seeding process...');
console.log(`📂 CSV File: ${CSV_FILE_PATH}`);
console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});



/**
 * Read and parse the CSV file
 */
async function readCSVFile() {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.resolve(CSV_FILE_PATH);
    
    console.log(`📖 Reading CSV file: ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      reject(new Error(`CSV file not found: ${csvPath}`));
      return;
    }
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Create tag record with direct 1-to-1 mapping from CSV to database schema
        const tagRecord = {
          step_id: row.step_id || null,
          question: row.question || null,
          possible_answer: row.possible_answer || null,
          tag: row.tag || null,
          tag_definition: row.tag_definition || null
        };
        
        results.push(tagRecord);
      })
      .on('end', () => {
        console.log(`✅ Successfully parsed ${results.length} rows from CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV file:', error.message);
        reject(error);
      });
  });
}

/**
 * Clear existing data from the tags table
 */
async function clearTagsTable() {
  console.log('🧹 Clearing existing tags table data...');
  
  try {
    const { error } = await supabase
      .from('tags')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Successfully cleared tags table');
  } catch (error) {
    console.error('❌ Error clearing tags table:', error.message);
    throw error;
  }
}

/**
 * Batch insert tag records into the database
 */
async function batchInsertTags(tagRecords) {
  console.log(`📥 Inserting ${tagRecords.length} tag records into database...`);
  
  try {
    // Remove any duplicate records based on step_id + possible_answer + tag
    const uniqueRecords = [];
    const seen = new Set();
    
    for (const record of tagRecords) {
      const key = `${record.step_id || ''}|${record.possible_answer || ''}|${record.tag || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(record);
      } else {
        console.log(`⚠️  Skipping duplicate tag: ${key}`);
      }
    }
    
    console.log(`📊 Inserting ${uniqueRecords.length} unique tag records (${tagRecords.length - uniqueRecords.length} duplicates removed)`);
    
    const { data, error } = await supabase
      .from('tags')
      .insert(uniqueRecords)
      .select('id');
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully inserted ${data.length} tag records`);
    return data;
  } catch (error) {
    console.error('❌ Error inserting tag records:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Verify the seeded data
 */
async function verifySeededData() {
  console.log('🔍 Verifying seeded data...');
  
  try {
    const { data, error, count } = await supabase
      .from('tags')
      .select('*', { count: 'exact' });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Verification complete: ${count} records in tags table`);
    
    // Show sample of inserted data
    if (data && data.length > 0) {
      console.log('📋 Sample records:');
      data.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.step_id}: ${record.tag} (${record.possible_answer})`);
      });
    }
    
    return count;
  } catch (error) {
    console.error('❌ Error verifying seeded data:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔄 Step 1: Connecting to Supabase...');
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('tags')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (testError) {
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }
    
    console.log('✅ Connected to Supabase successfully');
    
    console.log('🔄 Step 2: Clearing existing tags table data...');
    await clearTagsTable();
    
    console.log('🔄 Step 3: Reading and parsing CSV file...');
    const tagRecords = await readCSVFile();
    
    if (tagRecords.length === 0) {
      throw new Error('No records found in CSV file');
    }
    
    console.log('🔄 Step 4: Batch inserting tag records...');
    await batchInsertTags(tagRecords);
    
    console.log('🔄 Step 5: Verifying seeded data...');
    const finalCount = await verifySeededData();
    
    console.log('🎉 SUCCESS: Tags table seeding completed successfully!');
    console.log(`📊 Final stats: ${finalCount} records seeded from ${tagRecords.length} CSV rows`);
    
  } catch (error) {
    console.error('💥 FATAL ERROR during seeding process:');
    console.error(error.message);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Execute the main function
if (require.main === module) {
  main();
}

module.exports = { main, readCSVFile, clearTagsTable, batchInsertTags, verifySeededData };