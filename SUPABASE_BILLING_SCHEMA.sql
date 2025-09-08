-- LQS-P5-D-001: Add billing-related columns to the existing clients table
-- Execute this in Supabase SQL Editor for project: kwebsccgtmntljdrzwet

-- Add billing-related columns to the existing clients table
ALTER TABLE public.clients
ADD COLUMN billing_address TEXT,
ADD COLUMN rate_per_minute NUMERIC(10, 4), -- e.g., 999999.9999
ADD COLUMN rate_per_sms NUMERIC(10, 4),
ADD COLUMN rate_per_lead NUMERIC(10, 4);

-- Add descriptive comments for the new columns
COMMENT ON COLUMN public.clients.billing_address IS 'The physical or mailing address for client billing.';
COMMENT ON COLUMN public.clients.rate_per_minute IS 'The billing rate per conversational minute.';
COMMENT ON COLUMN public.clients.rate_per_sms IS 'The billing rate per SMS message sent/received.';
COMMENT ON COLUMN public.clients.rate_per_lead IS 'The billing rate per qualified lead generated.';