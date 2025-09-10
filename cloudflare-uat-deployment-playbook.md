# Cloudflare UAT Deployment Playbook

## Purpose
Reliable deployment of React frontend to Cloudflare Pages with cache purging to ensure fresh artifacts.

## Prerequisites
- CLOUDFLARE_API_TOKEN: Bn1tvyRlrqbcskg_CqYs0kzCek9zg7NXawNL318S
- CLOUDFLARE_ACCOUNT_ID: 1f57cd6021b00a5387e8fefdc2b0256e
- Working directory: apps/client-ui
- Target project: lqs-p12-uat

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

### Step 4: Purge Cloudflare Cache
```bash
export CLOUDFLARE_API_TOKEN=Bn1tvyRlrqbcskg_CqYs0kzCek9zg7NXawNL318S
npx wrangler pages deployment list --project-name lqs-p12-uat --limit 1
```

### Step 5: Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name lqs-p12-uat --commit-dirty=true
```

### Step 6: Extract and Return UAT URL
Parse deployment output for the new UAT URL in format: https://[hash].lqs-p12-uat.pages.dev

### Step 7: Update E2E Test Configuration
Update UAT_BASE_URL in e2e-tests/admin-dashboard.spec.js with new deployment URL

### Step 8: Verify Deployment
Run full E2E test suite to verify Phase 13 automation controls are deployed and functional

## Success Criteria
- All E2E tests pass (API and UI)
- Automation controls visible in deployed frontend
- New UAT URL accessible and functional
