# LQS UAT Environment

## Project Overview
- **Name**: Lead Qualification System (LQS) - UAT Environment
- **Goal**: Provide a comprehensive User Acceptance Testing environment for the LQS application
- **Features**: Authentication, Lead Management, Queue-based Processing, Multi-tenant Architecture

## URLs
- **UAT Environment**: https://lqs-uat-environment.pages.dev
- **API Gateway**: https://lqs-uat-api.charlesheflin.workers.dev
- **GitHub Repository**: https://github.com/sygnalz/lqs-monorepo

## Data Architecture
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Admin API integration
- **Storage Services**: Cloudflare Pages, Workers, and Queues
- **Data Flow**: API Gateway → Supabase Database → Queue Processing → Status Updates

## Deployed Components

### 1. Cloudflare Pages (Static Frontend)
- **Project**: `lqs-uat-environment`
- **URL**: https://lqs-uat-environment.pages.dev
- **Purpose**: UAT environment landing page and documentation

### 2. Cloudflare Workers (API Gateway)
- **Worker**: `lqs-uat-api`
- **URL**: https://lqs-uat-api.charlesheflin.workers.dev
- **Purpose**: API endpoints for authentication and lead management

### 3. Available API Endpoints
- `GET /api/health` - Health check and system status
- `POST /api/auth/signup` - User registration endpoint
- `POST /api/leads` - Lead creation (planned)
- `GET /api/leads/:id` - Lead status check (planned)

## Architecture Overview

```
┌─────────────────────────────────────┐
│     UAT Environment Frontend        │
│  https://lqs-uat-environment        │
│         .pages.dev                  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│        API Gateway Worker           │
│   https://lqs-uat-api.charlesheflin │
│         .workers.dev                │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│       Supabase Database             │
│  - Users & Authentication           │
│  - Clients (Multi-tenancy)          │
│  - Leads & Processing Status        │
└─────────────────────────────────────┘
```

## User Guide

### For UAT Testing:
1. **Access Environment**: Navigate to https://lqs-uat-environment.pages.dev
2. **Test Authentication**: Use API endpoints for user registration and login
3. **Create Leads**: Submit leads for processing via API
4. **Monitor Status**: Check lead qualification status and updates

### For Developers:
1. **Local Development**: Use `npm run dev` for local testing
2. **Build Process**: Run `npm run build` to compile for deployment
3. **Deployment**: Use `wrangler pages deploy` and `wrangler deploy` commands

## Deployment Status
- **Platform**: Cloudflare Pages + Workers
- **Status**: ✅ Active and Operational
- **Tech Stack**: Hono + TypeScript + Supabase + Cloudflare
- **Last Updated**: September 6, 2025
- **Environment**: User Acceptance Testing (UAT)

## Configuration Files
- `package.json` - Node.js dependencies and scripts
- `vite.config.ts` - Build configuration for Cloudflare Pages
- `functions/api/[[route]].ts` - Pages Functions (fallback)
- `worker.js` - Dedicated API Worker (primary)
- `public/index.html` - Static frontend interface

## Security & Multi-tenancy
- All data operations use Supabase Row Level Security (RLS)
- User isolation enforced at database level
- CORS properly configured for cross-origin requests
- Service role authentication for admin operations

## Next Steps
1. Complete integration of queue-based async processing
2. Add comprehensive lead management endpoints
3. Implement real-time status updates
4. Add monitoring and analytics capabilities

---

**Lead Qualification System (LQS) - UAT Environment**  
Ready for User Acceptance Testing