
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

UPDATE public.clients 
SET client_id = company_id 
WHERE client_id IS NULL AND company_id IS NOT NULL;

ALTER TABLE public.clients 
ALTER COLUMN client_id SET NOT NULL;

COMMENT ON COLUMN public.clients.client_id IS 'Foreign key to the company that this client belongs to. Matches worker.js expectations.';
