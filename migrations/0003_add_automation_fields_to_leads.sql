
ALTER TABLE leads 
ADD COLUMN last_action_type TEXT,
ADD COLUMN last_action_timestamp TIMESTAMPTZ,
ADD COLUMN next_action_type TEXT,
ADD COLUMN next_action_scheduled TIMESTAMPTZ,
ADD COLUMN automation_status TEXT DEFAULT 'active',
ADD COLUMN automation_notes TEXT;

CREATE INDEX idx_leads_automation_status ON leads(automation_status);

CREATE INDEX idx_leads_next_action_scheduled ON leads(next_action_scheduled);

COMMENT ON COLUMN leads.last_action_type IS 'Type of the last automation action performed (pause, resume, review-bin, etc.)';
COMMENT ON COLUMN leads.last_action_timestamp IS 'Timestamp when the last automation action was performed';
COMMENT ON COLUMN leads.next_action_type IS 'Type of the next scheduled automation action';
COMMENT ON COLUMN leads.next_action_scheduled IS 'Timestamp when the next automation action is scheduled';
COMMENT ON COLUMN leads.automation_status IS 'Current automation status: active, paused, review, etc.';
COMMENT ON COLUMN leads.automation_notes IS 'Additional notes about automation actions or status';
