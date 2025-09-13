-- Execute this in Supabase SQL Editor

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS automation_status VARCHAR(20) DEFAULT 'INACTIVE' CHECK (automation_status IN ('INACTIVE', 'ACTIVE', 'PAUSED', 'COMPLETED')),
ADD COLUMN IF NOT EXISTS last_action_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_action_scheduled TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_automation_status ON public.leads(automation_status);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_scheduled ON public.leads(next_action_scheduled);
CREATE INDEX IF NOT EXISTS idx_leads_last_action_timestamp ON public.leads(last_action_timestamp);

COMMENT ON COLUMN public.leads.automation_status IS 'Current automation status: INACTIVE, ACTIVE, PAUSED, COMPLETED';
COMMENT ON COLUMN public.leads.last_action_timestamp IS 'Timestamp of the last automated action taken for this lead';
COMMENT ON COLUMN public.leads.next_action_scheduled IS 'Timestamp when the next automated action is scheduled';
