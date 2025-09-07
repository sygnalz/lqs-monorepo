-- LQS Leads Schema Fix Script
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Step 1: Add missing columns
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS custom_data JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Add status constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'leads_status_check') THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_status_check 
        CHECK (status IN ('new', 'qualified', 'unqualified', 'contacted', 'converted'));
    END IF;
END $$;

-- Step 3: Fix foreign key relationship
DO $$ 
BEGIN
    -- Drop old foreign key if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'leads_client_id_fkey') THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_client_id_fkey;
    END IF;
    
    -- Add new foreign key to companies
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'leads_company_id_fkey') THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;

CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON public.leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Configure RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_tenant_policy" ON public.leads;
DROP POLICY IF EXISTS "Users can only access leads for their own client." ON public.leads;

CREATE POLICY "leads_tenant_policy" ON public.leads FOR ALL USING (
    company_id IN (
        SELECT c.id 
        FROM public.companies c 
        JOIN public.profiles p ON p.client_id = c.id 
        WHERE p.id = auth.uid()
    )
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(lead_email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Verification query
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Final verification
SELECT 'Schema fix completed successfully' as status;