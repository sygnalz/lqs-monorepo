-- Execute this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    goal_description TEXT,
    ai_instructions_and_persona TEXT,
    constraints JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_company_id ON public.playbooks(company_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_name ON public.playbooks(name);
CREATE INDEX IF NOT EXISTS idx_playbooks_created_at ON public.playbooks(created_at DESC);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view playbooks for their company" ON public.playbooks
    FOR SELECT USING (
        company_id IN (
            SELECT c.id 
            FROM public.companies c 
            JOIN public.profiles p ON p.client_id = c.id 
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all playbooks" ON public.playbooks
    FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_playbooks_updated_at
    BEFORE UPDATE ON public.playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_playbooks_updated_at();

COMMENT ON TABLE public.playbooks IS 'AI decision-making strategies and personas for lead management';
COMMENT ON COLUMN public.playbooks.company_id IS 'Company ID for multi-tenant isolation';
COMMENT ON COLUMN public.playbooks.name IS 'Playbook name/title';
COMMENT ON COLUMN public.playbooks.goal_description IS 'Description of the playbook goals and objectives';
COMMENT ON COLUMN public.playbooks.ai_instructions_and_persona IS 'AI instructions and persona configuration';
COMMENT ON COLUMN public.playbooks.constraints IS 'JSON constraints and rules for the playbook';
