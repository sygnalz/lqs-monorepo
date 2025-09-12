# AI Decision Engine Database Tables Migration

## Overview
This migration creates 6 new database tables required for the AI Decision Engine functionality:

1. **tags_taxonomy** - Master taxonomy of prospect tags with definitions
2. **prospect_tags** - Junction table linking prospects to their applied tags  
3. **playbooks** - AI conversation playbooks defining goals and personas
4. **initiatives** - Active campaigns running specific playbooks
5. **initiative_prospects** - Junction table linking initiatives to target prospects
6. **task_queue** - Queue of AI-generated tasks to be executed

## Files Created
- `ai-decision-engine-tables.sql` - Main migration script with table definitions, indexes, and RLS policies
- `populate-tags-taxonomy.py` - Python script to parse CSV and generate tag data
- `tags-taxonomy-data.sql` - Generated SQL with 168+ tag entries from CSV
- `test-ai-decision-engine-tables.sql` - Comprehensive test script

## Execution Instructions

### 1. Run Main Migration
Execute `ai-decision-engine-tables.sql` in Supabase SQL Editor

### 2. Verify Installation  
Execute `test-ai-decision-engine-tables.sql` to verify all tables, indexes, constraints, and RLS policies

### 3. Expected Results
- 6 new tables created with proper relationships
- 168+ tags populated in tags_taxonomy from CSV data
- Multi-tenant RLS policies enforcing client isolation
- Comprehensive indexes for query performance
- All foreign key constraints with CASCADE deletes

## Multi-Tenant Security
All tables follow existing RLS patterns:
- Service role has full access to all tables
- Users can only access data for their client
- tags_taxonomy is globally readable (reference data)
- All other tables enforce client_id isolation through joins

## Performance Considerations
- Indexes on all foreign keys and frequently queried fields
- Composite indexes for common query patterns
- Proper constraints to maintain data integrity

## Table Relationships

```
clients (existing)
├── playbooks (client_id)
└── initiatives (client_id)
    └── initiative_prospects (initiative_id)
        └── task_queue (initiative_id)

leads (existing)
├── prospect_tags (prospect_id)
├── initiative_prospects (prospect_id)
└── task_queue (prospect_id)

tags_taxonomy (global reference)
└── prospect_tags (tag)

playbooks
└── initiatives (playbook_id)
```

## Tag Categories from CSV
The migration populates tags_taxonomy with categories including:
- lead_type (buyer, seller, undecided)
- buyer_motivation (first_time, upsizing, downsizing, relocating, investment)
- buyer_timeframe (immediate, 0_3_months, 3_6_months, 6_12_months, long_term)
- buyer_financing (preapproved, planning_preapproval, cash_buyer, needs_guidance)
- seller_motivation (upsizing, downsizing, relocating, financial, investment_cashout)
- appointment_status (confirmed, reschedule_requested, unconfirmed)
- dnc_status (do_not_contact, reduced_contact)
- And many more...

## Validation Steps
1. All 6 tables created with correct schemas
2. Foreign key relationships established
3. RLS policies active and enforcing tenant isolation
4. Indexes created for performance
5. Sample data insertion/deletion works correctly
6. Tags taxonomy populated with 168+ entries from CSV
