-- Execute this in Supabase SQL Editor

-- =====================================================
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tags_taxonomy (
    tag TEXT PRIMARY KEY,
    definition TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_taxonomy_category ON public.tags_taxonomy(category);

COMMENT ON TABLE public.tags_taxonomy IS 'Master taxonomy of all available prospect tags with definitions';
COMMENT ON COLUMN public.tags_taxonomy.tag IS 'Unique tag identifier (e.g., buyer_motivation:first_time)';
COMMENT ON COLUMN public.tags_taxonomy.definition IS 'Human-readable definition of what this tag means';
COMMENT ON COLUMN public.tags_taxonomy.category IS 'Category grouping for the tag (e.g., buyer_motivation, appointment_status)';

-- =====================================================
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prospect_tags (
    prospect_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    tag TEXT REFERENCES public.tags_taxonomy(tag) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (prospect_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_prospect_tags_prospect_id ON public.prospect_tags(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_tags_tag ON public.prospect_tags(tag);
CREATE INDEX IF NOT EXISTS idx_prospect_tags_applied_at ON public.prospect_tags(applied_at DESC);

COMMENT ON TABLE public.prospect_tags IS 'Junction table linking prospects to their applied tags';
COMMENT ON COLUMN public.prospect_tags.prospect_id IS 'Reference to the lead/prospect';
COMMENT ON COLUMN public.prospect_tags.tag IS 'Reference to the tag from taxonomy';
COMMENT ON COLUMN public.prospect_tags.applied_at IS 'When this tag was applied to the prospect';

-- =====================================================
-- =====================================================
CREATE TABLE IF NOT EXISTS public.playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal_description TEXT NOT NULL,
    ai_instructions_and_persona TEXT NOT NULL,
    constraints JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_client_id ON public.playbooks(client_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_created_at ON public.playbooks(created_at DESC);

COMMENT ON TABLE public.playbooks IS 'AI conversation playbooks defining goals and personas for client campaigns';
COMMENT ON COLUMN public.playbooks.client_id IS 'Reference to the client who owns this playbook';
COMMENT ON COLUMN public.playbooks.name IS 'Human-readable name for the playbook';
COMMENT ON COLUMN public.playbooks.goal_description IS 'Description of what this playbook aims to achieve';
COMMENT ON COLUMN public.playbooks.ai_instructions_and_persona IS 'AI instructions and persona definition';
COMMENT ON COLUMN public.playbooks.constraints IS 'JSON constraints and rules for the playbook';

-- =====================================================
-- =====================================================
CREATE TABLE IF NOT EXISTS public.initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    playbook_id UUID REFERENCES public.playbooks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RUNNING','PAUSED','COMPLETED')),
    environmental_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_client_id ON public.initiatives(client_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_playbook_id ON public.initiatives(playbook_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON public.initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_created_at ON public.initiatives(created_at DESC);

COMMENT ON TABLE public.initiatives IS 'Active campaigns running specific playbooks for clients';
COMMENT ON COLUMN public.initiatives.client_id IS 'Reference to the client who owns this initiative';
COMMENT ON COLUMN public.initiatives.playbook_id IS 'Reference to the playbook being executed';
COMMENT ON COLUMN public.initiatives.name IS 'Human-readable name for the initiative';
COMMENT ON COLUMN public.initiatives.status IS 'Current status: DRAFT, RUNNING, PAUSED, COMPLETED';
COMMENT ON COLUMN public.initiatives.environmental_settings IS 'JSON configuration for this initiative run';

-- =====================================================
-- =====================================================
CREATE TABLE IF NOT EXISTS public.initiative_prospects (
    initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','GOAL_ACHIEVED','REVIEW_BIN','DNC','ERROR','PAUSED')),
    contact_attempts INTEGER DEFAULT 0,
    PRIMARY KEY (initiative_id, prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_initiative_prospects_initiative_id ON public.initiative_prospects(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiative_prospects_prospect_id ON public.initiative_prospects(prospect_id);
CREATE INDEX IF NOT EXISTS idx_initiative_prospects_status ON public.initiative_prospects(status);
CREATE INDEX IF NOT EXISTS idx_initiative_prospects_contact_attempts ON public.initiative_prospects(contact_attempts);

COMMENT ON TABLE public.initiative_prospects IS 'Junction table linking initiatives to their target prospects';
COMMENT ON COLUMN public.initiative_prospects.initiative_id IS 'Reference to the initiative';
COMMENT ON COLUMN public.initiative_prospects.prospect_id IS 'Reference to the prospect/lead';
COMMENT ON COLUMN public.initiative_prospects.status IS 'Status of this prospect in the initiative';
COMMENT ON COLUMN public.initiative_prospects.contact_attempts IS 'Number of contact attempts made';

-- =====================================================
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('CALL','SMS','WAIT','REVIEW','COMPLETE')),
    action_payload JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','EXECUTED','FAILED','INTERRUPTED','VALIDATION_FAILED')),
    ai_rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_queue_prospect_id ON public.task_queue(prospect_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_initiative_id ON public.task_queue(initiative_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_action_type ON public.task_queue(action_type);
CREATE INDEX IF NOT EXISTS idx_task_queue_scheduled_for ON public.task_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON public.task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_created_at ON public.task_queue(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_queue_status_scheduled ON public.task_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_task_queue_initiative_status ON public.task_queue(initiative_id, status);

COMMENT ON TABLE public.task_queue IS 'Queue of AI-generated tasks to be executed for prospects';
COMMENT ON COLUMN public.task_queue.prospect_id IS 'Reference to the target prospect';
COMMENT ON COLUMN public.task_queue.initiative_id IS 'Reference to the initiative generating this task';
COMMENT ON COLUMN public.task_queue.action_type IS 'Type of action: CALL, SMS, WAIT, REVIEW, COMPLETE';
COMMENT ON COLUMN public.task_queue.action_payload IS 'JSON payload with action-specific data';
COMMENT ON COLUMN public.task_queue.scheduled_for IS 'When this task should be executed';
COMMENT ON COLUMN public.task_queue.status IS 'Current execution status';
COMMENT ON COLUMN public.task_queue.ai_rationale IS 'AI explanation for why this task was created';

-- =====================================================
-- =====================================================

ALTER TABLE public.tags_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiative_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all tags_taxonomy" ON public.tags_taxonomy FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all prospect_tags" ON public.prospect_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all playbooks" ON public.playbooks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all initiatives" ON public.initiatives FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all initiative_prospects" ON public.initiative_prospects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage all task_queue" ON public.task_queue FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read tags_taxonomy" ON public.tags_taxonomy FOR SELECT USING (true);

CREATE POLICY "Users can access prospect_tags for their client" ON public.prospect_tags FOR ALL USING (
    prospect_id IN (
        SELECT l.id FROM public.leads l
        JOIN public.clients c ON l.client_id = c.id
        JOIN public.profiles p ON p.client_id = c.id
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Users can access playbooks for their client" ON public.playbooks FOR ALL USING (
    client_id IN (
        SELECT p.client_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Users can access initiatives for their client" ON public.initiatives FOR ALL USING (
    client_id IN (
        SELECT p.client_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Users can access initiative_prospects for their client" ON public.initiative_prospects FOR ALL USING (
    initiative_id IN (
        SELECT i.id FROM public.initiatives i
        JOIN public.profiles p ON p.client_id = i.client_id
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Users can access task_queue for their client" ON public.task_queue FOR ALL USING (
    initiative_id IN (
        SELECT i.id FROM public.initiatives i
        JOIN public.profiles p ON p.client_id = i.client_id
        WHERE p.id = auth.uid()
    )
);
-- Populate tags_taxonomy table from CSV data
INSERT INTO public.tags_taxonomy (tag, definition, category) VALUES
    ('lead_type:buyer', 'The lead has expressed interest in buying a property', 'lead_type'),
    ('lead_type:seller', 'The lead has expressed interest in selling a property', 'lead_type'),
    ('lead_type:undecided', 'The lead is unsure and just exploring options', 'lead_type'),
    ('buyer_motivation:first_time', 'The lead is purchasing their first property', 'buyer_motivation'),
    ('buyer_motivation:upsizing', 'The lead wants a larger home with more space', 'buyer_motivation'),
    ('buyer_motivation:downsizing', 'The lead wants a smaller home with less maintenance', 'buyer_motivation'),
    ('buyer_motivation:relocating', 'The lead is moving due to work, school, or lifestyle changes', 'buyer_motivation'),
    ('buyer_motivation:investment', 'The lead is buying as an investor', 'buyer_motivation'),
    ('buyer_timeframe:immediate', 'The lead is actively looking for a home right now', 'buyer_timeframe'),
    ('buyer_timeframe:0_3_months', 'The lead wants to buy within the next 3 months', 'buyer_timeframe'),
    ('buyer_timeframe:3_6_months', 'The lead wants to buy in the next 3–6 months', 'buyer_timeframe'),
    ('buyer_timeframe:6_12_months', 'The lead is planning a move within 6–12 months', 'buyer_timeframe'),
    ('buyer_timeframe:long_term', 'The lead is planning to buy in a year or later', 'buyer_timeframe'),
    ('buyer_financing:preapproved', 'The lead has mortgage pre-approval', 'buyer_financing'),
    ('buyer_financing:planning_preapproval', 'The lead is planning to get pre-approval', 'buyer_financing'),
    ('buyer_financing:cash_buyer', 'The lead intends to purchase with cash', 'buyer_financing'),
    ('buyer_financing:needs_guidance', 'The lead is unfamiliar with the mortgage process', 'buyer_financing'),
    ('buyer_home_type:single_family', 'The lead prefers a detached single-family residence', 'buyer_home_type'),
    ('buyer_home_type:condo', 'The lead prefers a condominium', 'buyer_home_type'),
    ('buyer_home_type:townhome', 'The lead prefers a townhouse', 'buyer_home_type'),
    ('buyer_home_type:multifamily', 'The lead prefers a duplex or multi-family property', 'buyer_home_type'),
    ('buyer_home_type:land', 'The lead is interested in vacant land', 'buyer_home_type'),
    ('buyer_home_type:luxury', 'The lead is seeking a luxury property', 'buyer_home_type'),
    ('buyer_home_type:flexible', 'The lead is open to different property types', 'buyer_home_type'),
    ('buyer_location:defined', 'The lead has a specific area chosen', 'buyer_location'),
    ('buyer_location:flexible', 'The lead is open to several neighborhoods', 'buyer_location'),
    ('buyer_location:out_of_area', 'The lead is moving in from another city/state', 'buyer_location'),
    ('appointment_intent:yes', 'Lead agrees to set a buyer consultation', 'appointment_intent'),
    ('appointment_intent:no', 'Lead declines to set an appointment at this time', 'appointment_intent'),
    ('appointment_intent:maybe', 'Lead is open to an appointment but needs times/options', 'appointment_intent'),
    ('appointment_mode:phone', 'Lead prefers phone call for the appointment', 'appointment_mode'),
    ('appointment_mode:video', 'Lead prefers video meeting for the appointment', 'appointment_mode'),
    ('appointment_mode:in_person', 'Lead prefers an in-person meeting', 'appointment_mode'),
    ('appointment_time_pref:morning', 'Lead prefers morning time slots', 'appointment_time_pref'),
    ('appointment_time_pref:afternoon', 'Lead prefers afternoon time slots', 'appointment_time_pref'),
    ('appointment_time_pref:evening', 'Lead prefers evening time slots', 'appointment_time_pref'),
    ('appointment_time_pref:weekend', 'Lead prefers weekends', 'appointment_time_pref'),
    ('appointment_booking_method:text_link', 'Lead wants a booking link sent via SMS', 'appointment_booking_method'),
    ('appointment_booking_method:email_link', 'Lead wants a booking link sent via email', 'appointment_booking_method'),
    ('appointment_booking_method:manual_times', 'Lead prefers the agent to propose specific times', 'appointment_booking_method'),
    ('appointment_candidate:today_pm', 'Lead is open to an appointment today afternoon/evening', 'appointment_candidate'),
    ('appointment_candidate:tomorrow_am', 'Lead is open to an appointment tomorrow morning', 'appointment_candidate'),
    ('appointment_candidate:tomorrow_pm', 'Lead is open to an appointment tomorrow afternoon/evening', 'appointment_candidate'),
    ('appointment_status:confirmed', 'Appointment date/time is confirmed by the lead', 'appointment_status'),
    ('appointment_status:reschedule_requested', 'Lead asks to change the date/time', 'appointment_status'),
    ('appointment_status:unconfirmed', 'Appointment not confirmed by the lead', 'appointment_status'),
    ('buyer_showing_request:yes', 'Lead wants to schedule property showings', 'buyer_showing_request'),
    ('buyer_showing_request:no', 'Lead does not want to schedule showings yet', 'buyer_showing_request'),
    ('buyer_lender_intro:yes', 'Lead requests a lender introduction', 'buyer_lender_intro'),
    ('buyer_lender_intro:has_lender', 'Lead already has a lender', 'buyer_lender_intro'),
    ('buyer_lender_intro:no', 'Lead is not interested in lender intro', 'buyer_lender_intro'),
    ('local_events_interest:yes', 'The lead wants to receive local community event updates', 'local_events_interest'),
    ('local_events_interest:no', 'The lead does not want local community event updates', 'local_events_interest'),
    ('buyer_obstacle:affordability', 'The lead is concerned about affording a home', 'buyer_obstacle'),
    ('buyer_obstacle:need_to_sell', 'The lead must sell a property before buying', 'buyer_obstacle'),
    ('buyer_obstacle:credit', 'The lead is worried about their credit situation', 'buyer_obstacle'),
    ('buyer_obstacle:uncertainty', 'The lead has personal/job instability', 'buyer_obstacle'),
    ('buyer_obstacle:none', 'The lead has no major buying obstacles', 'buyer_obstacle'),
    ('buyer_engagement:home_alerts_yes', 'The lead wants to receive property alerts', 'buyer_engagement'),
    ('buyer_engagement:home_alerts_no', 'The lead does not want property alerts', 'buyer_engagement'),
    ('seller_ownership:confirmed', 'The lead owns the property they want to sell', 'seller_ownership'),
    ('seller_ownership:not_owner', 'The lead does not currently own the property', 'seller_ownership'),
    ('seller_motivation:upsizing', 'The lead wants to sell to purchase a larger home', 'seller_motivation'),
    ('seller_motivation:downsizing', 'The lead wants to sell to move into a smaller home', 'seller_motivation'),
    ('seller_motivation:relocating', 'The lead is moving to another location', 'seller_motivation'),
    ('seller_motivation:financial', 'The lead needs to sell due to financial pressures', 'seller_motivation'),
    ('seller_motivation:investment_cashout', 'The lead is selling an investment property for returns', 'seller_motivation'),
    ('seller_motivation:other', 'The lead has another reason for selling', 'seller_motivation'),
    ('seller_timeframe:immediate', 'The lead wants to list their home right away', 'seller_timeframe'),
    ('seller_timeframe:0_3_months', 'The lead wants to list within 3 months', 'seller_timeframe'),
    ('seller_timeframe:3_6_months', 'The lead plans to sell in 3–6 months', 'seller_timeframe'),
    ('seller_timeframe:6_12_months', 'The lead is planning to sell in 6–12 months', 'seller_timeframe'),
    ('seller_timeframe:long_term', 'The lead is considering selling in a year or more', 'seller_timeframe'),
    ('seller_property_condition:updated', 'The property has recent updates or renovations', 'seller_property_condition'),
    ('seller_property_condition:original', 'The property has not been updated recently', 'seller_property_condition'),
    ('seller_pricing:has_price', 'The lead has a target listing price in mind', 'seller_pricing'),
    ('seller_pricing:needs_guidance', 'The lead needs guidance on pricing', 'seller_pricing'),
    ('seller_appointment_type:pricing_strategy', 'Lead wants a pricing/comps strategy meeting', 'seller_appointment_type'),
    ('seller_appointment_type:skip_pricing', 'Lead declines a pricing session', 'seller_appointment_type'),
    ('seller_appointment_type:listing_prep', 'Lead wants a listing preparation coordination session', 'seller_appointment_type'),
    ('seller_appointment_type:skip_prep', 'Lead declines listing prep coordination', 'seller_appointment_type'),
    ('seller_next_step:buying_after_selling', 'The lead needs to purchase another home after selling', 'seller_next_step'),
    ('seller_next_step:no_buy_needed', 'The lead does not need to buy after selling', 'seller_next_step'),
    ('seller_obstacle:finding_new_home', 'The lead is worried about securing their next home', 'seller_obstacle'),
    ('seller_obstacle:market_conditions', 'The lead is concerned about current real estate market conditions', 'seller_obstacle'),
    ('seller_obstacle:repairs', 'The property needs repairs before sale', 'seller_obstacle'),
    ('seller_obstacle:financial', 'The lead has financial limitations affecting the sale', 'seller_obstacle'),
    ('seller_obstacle:none', 'The lead reports no major obstacles to selling', 'seller_obstacle'),
    ('seller_engagement:cma_yes', 'The lead wants a comparative market analysis', 'seller_engagement'),
    ('seller_engagement:cma_no', 'The lead does not want a comparative market analysis', 'seller_engagement'),
    ('exploring_interest:market', 'The lead is mainly interested in overall real estate market conditions', 'exploring_interest'),
    ('exploring_interest:neighborhoods', 'The lead is curious about local neighborhoods and communities', 'exploring_interest'),
    ('exploring_interest:just_browsing', 'The lead is casually looking with no clear intention yet', 'exploring_interest'),
    ('exploring_future_intent:buyer_future', 'The lead may be interested in buying in the future', 'exploring_future_intent'),
    ('exploring_future_intent:seller_future', 'The lead may be interested in selling in the future', 'exploring_future_intent'),
    ('exploring_future_intent:learning', 'The lead is only gathering information right now', 'exploring_future_intent'),
    ('exploring_timeframe:0_3_months', 'The lead may become active in the next 3 months', 'exploring_timeframe'),
    ('exploring_timeframe:3_6_months', 'The lead may become active in 3–6 months', 'exploring_timeframe'),
    ('exploring_timeframe:6_12_months', 'The lead may become active in 6–12 months', 'exploring_timeframe'),
    ('exploring_timeframe:long_term', 'The lead may become active in a year or more', 'exploring_timeframe'),
    ('exploring_timeframe:unknown', 'The lead is unsure about their future real estate plans', 'exploring_timeframe'),
    ('exploring_engagement:market_updates_yes', 'The lead wants to receive market updates', 'exploring_engagement'),
    ('exploring_engagement:market_updates_no', 'The lead does not want market updates', 'exploring_engagement'),
    ('dnc_status:do_not_contact', 'Lead has requested no further contact via any channel', 'dnc_status'),
    ('dnc_status:reduced_contact', 'Lead requests fewer messages instead of full DNC', 'dnc_status'),
    ('dnc_channel:phone', 'Lead requests no phone calls', 'dnc_channel'),
    ('dnc_channel:sms', 'Lead requests no text messages', 'dnc_channel'),
    ('dnc_channel:email', 'Lead requests no emails', 'dnc_channel'),
    ('dnc_channel:all', 'Lead requests no contact via any channel', 'dnc_channel'),
    ('representation_status:other_agent', 'Lead is already represented by another real estate agent', 'representation_status'),
    ('representation_status:none', 'Lead is not represented by another agent', 'representation_status'),
    ('unsubscribe_scope:marketing_only', 'Lead opts out of marketing communications but allows transactional messages', 'unsubscribe_scope'),
    ('unsubscribe_scope:all', 'Lead opts out of all communications including transactional', 'unsubscribe_scope'),
    ('unsubscribe_scope:none', 'Lead keeps all communications', 'unsubscribe_scope'),
    ('consent_logging:recorded', 'Consent/DNC preference recorded for compliance', 'consent_logging'),
    ('consent_logging:not_recorded', 'Lead does not allow logging of consent/DNC preference', 'consent_logging'),
    ('dnc_confirmation_channel:sms', 'Lead prefers SMS confirmation of DNC settings', 'dnc_confirmation_channel'),
    ('dnc_confirmation_channel:email', 'Lead prefers email confirmation of DNC settings', 'dnc_confirmation_channel'),
    ('dnc_confirmation_channel:none', 'Lead does not need DNC confirmation message', 'dnc_confirmation_channel'),
    ('dnc_reason:frequency', 'Lead opts out due to message frequency', 'dnc_reason'),
    ('dnc_reason:not_interested', 'Lead opts out due to lack of interest', 'dnc_reason'),
    ('dnc_reason:wrong_contact', 'Lead opts out because contact info is incorrect', 'dnc_reason'),
    ('dnc_reason:other_agent', 'Lead opts out because they already have an agent', 'dnc_reason'),
    ('dnc_reason:other', 'Lead opts out for another reason', 'dnc_reason'),
    ('dnc_enforcement:active', 'DNC flags are active; lead should not be contacted on suppressed channels', 'dnc_enforcement'),
    ('compliance_audit:logged', 'Consent/DNC preferences captured for auditability', 'compliance_audit')
ON CONFLICT (tag) DO NOTHING;

-- Total tags inserted: 126
