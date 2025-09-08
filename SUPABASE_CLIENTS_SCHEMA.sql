-- Manual Schema Update Required for Clients Table
-- Execute this SQL in Supabase SQL Editor to fix the clients table schema

-- Step 1: Drop existing clients table (has incomplete schema)
DROP TABLE IF EXISTS public.clients CASCADE;

-- Step 2: Create clients table with correct schema as per LQS-P3-D-002 directive
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL
);

-- Step 3: Add comments for clarity
COMMENT ON TABLE public.clients IS 'Stores client records, which are organizations or individuals for whom leads are managed.';
COMMENT ON COLUMN public.clients.company_id IS 'Foreign key to the company that this client belongs to.';

-- Step 4: Disable Row Level Security (RLS) as per directive
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- Step 5: Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position;