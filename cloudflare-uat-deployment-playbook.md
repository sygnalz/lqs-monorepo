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

### Step 8: Validate Success
Ensure all 3 E2E tests pass:
- Admin Dashboard API Integration Verification
- Complete Admin Dashboard Workflow (with "Last Action" and "Next Action" columns)
- should display automation controls (with checkboxes and bulk actions)

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
