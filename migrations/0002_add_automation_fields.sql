-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_action_type TEXT,
ADD COLUMN IF NOT EXISTS last_action_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_action_type TEXT,
ADD COLUMN IF NOT EXISTS next_action_scheduled TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS automation_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS automation_notes TEXT;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'leads_automation_status_check') THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_automation_status_check 
        CHECK (automation_status IN ('active', 'paused', 'review_bin'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_automation_status ON public.leads(automation_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_action_timestamp ON public.leads(last_action_timestamp);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_scheduled ON public.leads(next_action_scheduled);

COMMENT ON COLUMN public.leads.last_action_type IS 'Type of the last action performed (e.g., call, sms, email)';
COMMENT ON COLUMN public.leads.last_action_timestamp IS 'Timestamp when the last action was performed';
COMMENT ON COLUMN public.leads.next_action_type IS 'Type of the next planned action';
COMMENT ON COLUMN public.leads.next_action_scheduled IS 'Scheduled timestamp for the next action';
COMMENT ON COLUMN public.leads.automation_status IS 'Current automation status: active, paused, or review_bin';
COMMENT ON COLUMN public.leads.automation_notes IS 'Notes about automation status or actions';

-- Verification query
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND table_schema = 'public'
  AND column_name IN ('last_action_type', 'last_action_timestamp', 'next_action_type', 'next_action_scheduled', 'automation_status', 'automation_notes')
ORDER BY ordinal_position;

-- Final verification
SELECT 'Automation fields migration completed successfully' as status;
