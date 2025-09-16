-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone_e164 TEXT NOT NULL,
    timezone TEXT NOT NULL,
    path_hint TEXT NOT NULL,
    consent_status TEXT NOT NULL CHECK (consent_status IN ('granted', 'denied')),
    consent_source TEXT NOT NULL,
    consent_timestamp_iso TEXT NOT NULL,
    lead_source TEXT,
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT prospects_client_phone_unique UNIQUE (client_id, phone_e164)
);

CREATE OR REPLACE FUNCTION update_prospects_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_prospects_updated_at ON public.prospects;

CREATE TRIGGER update_prospects_updated_at 
    BEFORE UPDATE ON public.prospects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_prospects_updated_at_column();

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospects_tenant_policy" ON public.prospects;

CREATE POLICY "prospects_tenant_policy" ON public.prospects FOR ALL USING (
    client_id IN (
        SELECT c.id 
        FROM public.clients c 
        JOIN public.profiles p ON p.client_id = c.id 
        WHERE p.id = auth.uid()
    )
);

CREATE INDEX IF NOT EXISTS idx_prospects_client_id ON public.prospects(client_id);
CREATE INDEX IF NOT EXISTS idx_prospects_phone_e164 ON public.prospects(phone_e164);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON public.prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON public.prospects(created_at);
CREATE INDEX IF NOT EXISTS idx_prospects_consent_status ON public.prospects(consent_status);

-- Verification query
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'prospects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Final verification
SELECT 'Prospects schema created successfully' as status;
