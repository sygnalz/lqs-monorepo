# CRITICAL: Communications Table Migration Instructions

## ⚠️ URGENT UAT BLOCKER RESOLUTION

The `public.communications` table is missing from the database, preventing email notification verification. **This migration must be executed manually in Supabase SQL Editor.**

## 📋 Manual Migration Steps

### 1. Access Supabase SQL Editor
1. Go to your Supabase dashboard: https://app.supabase.com/
2. Select your UAT project
3. Navigate to **SQL Editor** in the left sidebar
4. Create a **New Query**

### 2. Execute the Migration Script

**Copy and paste the ENTIRE script below into the SQL Editor:**

```sql
-- Migration: Create communications audit logging table
-- Description: Track all outbound communications (email, SMS, etc.) for audit purposes
-- Date: 2025-09-06

CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key references
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    
    -- Communication details
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'webhook')),
    recipient VARCHAR(255) NOT NULL, -- Email address, phone number, etc.
    subject TEXT, -- Email subject or SMS/push title
    content TEXT, -- Full message content or template reference
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'rejected')),
    
    -- Third-party service integration
    provider VARCHAR(50), -- 'resend', 'twilio', 'sendgrid', etc.
    external_id VARCHAR(255), -- ID from third-party API (e.g., Resend message ID)
    external_reference JSONB, -- Full API response for debugging
    
    -- Error handling
    error_message TEXT, -- Error details if status = 'failed'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE, -- When actually sent to provider
    delivered_at TIMESTAMP WITH TIME ZONE, -- When confirmed delivered (webhooks)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata for advanced features
    template_id VARCHAR(100), -- Template reference
    template_variables JSONB, -- Variables used in template
    campaign_id VARCHAR(100), -- For grouping related communications
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=highest, 10=lowest
    
    -- Compliance and audit
    consent_status VARCHAR(20) DEFAULT 'unknown' CHECK (consent_status IN ('granted', 'denied', 'unknown', 'withdrawn')),
    compliance_notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON public.communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON public.communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_provider ON public.communications(provider);
CREATE INDEX IF NOT EXISTS idx_communications_external_id ON public.communications(external_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_communications_lead_type_status ON public.communications(lead_id, type, status);
CREATE INDEX IF NOT EXISTS idx_communications_client_created ON public.communications(client_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access communications for their client
CREATE POLICY "Users can view communications for their client" ON public.communications
    FOR SELECT USING (
        client_id IN (
            SELECT p.client_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- RLS Policy: Service role can manage all communications
CREATE POLICY "Service role can manage all communications" ON public.communications
    FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_communications_updated_at
    BEFORE UPDATE ON public.communications
    FOR EACH ROW
    EXECUTE FUNCTION update_communications_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.communications IS 'Audit log for all outbound communications (email, SMS, push notifications, webhooks)';
COMMENT ON COLUMN public.communications.lead_id IS 'Reference to the lead that triggered this communication';
COMMENT ON COLUMN public.communications.client_id IS 'Reference to the client for multi-tenant isolation';
COMMENT ON COLUMN public.communications.type IS 'Type of communication: email, sms, push, webhook';
COMMENT ON COLUMN public.communications.recipient IS 'Destination address (email, phone, etc.)';
COMMENT ON COLUMN public.communications.status IS 'Current status: pending, sent, delivered, failed, bounced, rejected';
COMMENT ON COLUMN public.communications.provider IS 'Third-party service provider (resend, twilio, etc.)';
COMMENT ON COLUMN public.communications.external_id IS 'ID returned by third-party API';
COMMENT ON COLUMN public.communications.external_reference IS 'Full API response for debugging';
COMMENT ON COLUMN public.communications.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN public.communications.template_variables IS 'Variables substituted in message templates';
COMMENT ON COLUMN public.communications.consent_status IS 'Communication consent status for compliance';
```

### 3. Execute and Verify

1. Click **Run** to execute the migration
2. You should see success messages for each statement
3. Verify the table was created by running this verification query:

```sql
-- Verification query
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'communications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
```

### 4. Expected Results

You should see **24 columns** in the communications table:
- id, lead_id, client_id, type, recipient, subject, content
- status, provider, external_id, external_reference
- error_message, retry_count, max_retries
- created_at, sent_at, delivered_at, updated_at
- template_id, template_variables, campaign_id, priority
- consent_status, compliance_notes

## 🚨 Post-Migration Actions

**After successful migration:**
1. ✅ Updated lead-processor worker is already deployed with communications logging
2. ✅ Worker will now log all email notifications to the communications table
3. ✅ End-to-end verification can be performed once table exists

## 📊 Worker Integration Status

The `lqs-lead-processor` worker has been updated and deployed with:
- ✅ `sendQualificationEmail()` - Sends emails via Resend API simulation
- ✅ `logCommunication()` - Creates communication records before sending
- ✅ `updateCommunicationStatus()` - Updates records with send results
- ✅ `generateEmailContent()` - Creates personalized email content
- ✅ Complete error handling and retry logic
- ✅ Deployed to: https://lqs-lead-processor.charlesheflin.workers.dev

## 🔍 Next Steps After Migration

Once you've executed the migration:
1. **Verification Test**: Run the end-to-end integration test
2. **Monitor Communications**: Check that processed leads create communication records
3. **GitHub Sync**: All changes will be committed and pushed to repository

**Worker URL**: https://lqs-lead-processor.charlesheflin.workers.dev
**Cron Schedule**: Runs every minute to process queued leads

---

**Status**: ⚠️ WAITING FOR MANUAL MIGRATION EXECUTION
**Priority**: 🔴 CRITICAL UAT BLOCKER