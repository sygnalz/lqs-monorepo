# Cloudflare UAT Deployment Playbook

## Purpose
Reliable deployment of React frontend to Cloudflare Pages with cache-busting to ensure fresh artifacts and bypass caching issues.

## Prerequisites
- CLOUDFLARE_API_TOKEN: Bn1tvyRlrqbcskg_CqYs0kzCek9zg7NXawNL318S
- CLOUDFLARE_ACCOUNT_ID: 1f57cd6021b00a5387e8fefdc2b0256e
- Working directory: apps/client-ui
- Git branch: feature/lqs-p13-automation-controls-final

## Playbook Steps

### Step 1: Clean Build Environment
```bash
cd apps/client-ui
rm -rf dist node_modules/.vite node_modules/.cache .vite
```

### Step 2: Fresh Install Dependencies
```bash
npm ci
```

### Step 3: Build React Application
```bash
npm run build
```

### Step 4: Deploy to Fresh Cloudflare Project (Cache-Busting Strategy)
```bash
export CLOUDFLARE_API_TOKEN=Bn1tvyRlrqbcskg_CqYs0kzCek9zg7NXawNL318S
npx wrangler pages deploy dist --project-name lqs-phase13-final-$(date +%s) --commit-dirty=true
```
Note: Using timestamp-based project names ensures completely fresh deployments without cached artifacts.

### Step 5: Extract and Return UAT URL
Parse deployment output for the new UAT URL in format: https://[hash].[project-name].pages.dev

### Step 6: Update E2E Test Configuration
Update UAT_BASE_URL in e2e-tests/admin-dashboard.spec.js with new deployment URL

### Step 7: Verify Deployment
Run full E2E test suite to verify Phase 13 automation controls are deployed and functional:
```bash
npx playwright test e2e-tests/admin-dashboard.spec.js --reporter=line
```

### Step 8: Apply Database Migration (Critical for Phase 13)
**IMPORTANT:** Before running E2E tests, ensure the automation fields migration has been applied to the UAT Supabase database:
```sql
-- Execute this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- File: migrations/0002_add_automation_fields.sql

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_action_type TEXT,
ADD COLUMN IF NOT EXISTS last_action_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_action_type TEXT,
ADD COLUMN IF NOT EXISTS next_action_scheduled TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS automation_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS automation_notes TEXT;

-- Add constraint and indexes
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
```

### Step 9: Validate Success
Ensure all 3 E2E tests pass:
- Admin Dashboard API Integration Verification
- Complete Admin Dashboard Workflow (with "Last Action" and "Next Action" columns)
- should display automation controls (with checkboxes and bulk actions)

## Root Cause Analysis - Phase 13 Deployment Issue
**Issue:** Automation controls implemented in frontend and backend but not appearing in deployed UI
**Root Cause:** Database migration not applied - automation fields don't exist in UAT database schema
**Solution:** Apply migrations/0002_add_automation_fields.sql to add required automation fields to leads table
**Impact:** Without automation fields in database, backend returns null/undefined values causing conditional rendering to hide controls

## Execution Log - Phase 13 Deployment
**Executed:** September 10, 2025 20:36 UTC
**Branch:** feature/lqs-p13-automation-controls-final
**Project:** lqs-phase13-final-1757536460
**Deployment URL:** https://55621567.lqs-phase13-final-1757536460.pages.dev
**Status:** Successfully uploaded 3 files (fresh deployment, no cached artifacts)

## Success Criteria
- All E2E tests pass (API and UI)
- Automation controls visible in deployed frontend
- New UAT URL accessible and functional
- Phase 13 features: "Last Action" and "Next Action" columns, bulk selection checkboxes, kebab menus
