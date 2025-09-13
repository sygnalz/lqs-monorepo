-- Execute this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    prospect_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('SMS', 'CALL', 'WAIT', 'REVIEW', 'COMPLETE')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    ai_rationale TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    
    executed_at TIMESTAMPTZ,
    executed_by UUID REFERENCES auth.users(id),
    execution_result JSONB,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT future_scheduled_time CHECK (scheduled_for > created_at)
);

CREATE INDEX IF NOT EXISTS idx_task_queue_prospect_id ON public.task_queue(prospect_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_company_id ON public.task_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON public.task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_scheduled_for ON public.task_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_task_queue_action_type ON public.task_queue(action_type);

CREATE INDEX IF NOT EXISTS idx_task_queue_prospect_created ON public.task_queue(prospect_id, created_at DESC);

ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for their company" ON public.task_queue
    FOR SELECT USING (
        company_id IN (
            SELECT c.id 
            FROM public.companies c 
            JOIN public.profiles p ON p.client_id = c.id 
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all tasks" ON public.task_queue
    FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_task_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_queue_updated_at
    BEFORE UPDATE ON public.task_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_task_queue_updated_at();

COMMENT ON TABLE public.task_queue IS 'Queue for AI-generated tasks to be executed by automation system';
COMMENT ON COLUMN public.task_queue.prospect_id IS 'Reference to the lead/prospect this task is for';
COMMENT ON COLUMN public.task_queue.company_id IS 'Company ID for multi-tenant isolation';
COMMENT ON COLUMN public.task_queue.action_type IS 'Type of action: SMS, CALL, WAIT, REVIEW, COMPLETE';
COMMENT ON COLUMN public.task_queue.scheduled_for IS 'When this task should be executed';
COMMENT ON COLUMN public.task_queue.ai_rationale IS 'AI explanation for why this action was chosen';
