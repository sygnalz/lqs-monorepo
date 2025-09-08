-- LQS-P6-D-001: Re-architect Backend for Client-Owned Leads
-- Execute this in Supabase SQL Editor for project: kwebsccgtmntljdrzwet
-- 
-- This migration refactors the leads table to establish proper ownership relationship
-- where each Lead belongs to a specific Client instead of directly to a Company.

-- Step 1: Drop the redundant company_id column
-- This column incorrectly associated leads directly with companies
ALTER TABLE public.leads 
DROP COLUMN IF EXISTS company_id;

-- Step 2: Add the new client_id foreign key relationship
-- This establishes proper lead ownership under specific clients
-- ON DELETE CASCADE ensures data integrity - if a client is deleted, their leads are automatically removed
ALTER TABLE public.leads 
ADD COLUMN client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add descriptive comment for the new column
COMMENT ON COLUMN public.leads.client_id IS 'Foreign key reference to the client that owns this lead. ON DELETE CASCADE ensures leads are automatically removed when their associated client is deleted.';

-- Verify the migration by checking the updated table structure
-- Uncomment the following line to verify after execution:
-- \d public.leads;