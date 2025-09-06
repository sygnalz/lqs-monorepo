# Lead Qualification System (LQS) - UI/UX Development Phase

## Project Overview
- **Name**: Lead Qualification System (LQS)
- **Goal**: A complete lead management system with automated qualification and client interface
- **Current Phase**: UI/UX Development (React Frontend)

## URLs
- **Frontend Development**: https://3000-i275f7i7rti91t1yfinmh-6532622b.e2b.dev
- **Backend API**: https://lqs-uat-worker.charlesheflin.workers.dev
- **GitHub Repository**: https://github.com/sygnalz/lqs-monorepo.git

## Architecture Overview

### Frontend (Current Implementation)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite
- **Location**: `/apps/client-ui/`

### Backend (Existing - Verified)
- **API Gateway**: Cloudflare Worker (`lqs-uat-worker`)
- **Background Processor**: Scheduled Cloudflare Worker (`lqs-lead-processor`)
- **Database**: Supabase PostgreSQL
- **Authentication**: JWT-based with Supabase Auth

## Data Architecture
- **User Management**: Supabase `auth.users` table
- **Multi-tenancy**: `public.profiles` links users to `public.clients`
- **Lead Storage**: `public.leads` table with automated status updates
- **Data Flow**: Client creates leads → Background processor qualifies → Status updated

## Current Features (Completed)

### ✅ Authentication System
- Sign up with email, password, and company name
- Sign in with email and password
- JWT token management with automatic headers
- Protected routes with authentication guards
- UAT test credentials helper

### ✅ Dashboard Interface
- Welcome message with user email
- API health status monitoring (real-time)
- Lead creation form with validation
- Recent leads display with status badges
- Secure logout functionality

### ✅ API Integration
- Axios client with automatic token injection
- Error handling with 401 redirect
- Environment-based API configuration
- Health check endpoint monitoring

### ✅ UI/UX Components
- Responsive design with Tailwind CSS
- Form validation and error messages
- Loading states and success notifications
- Status badges for lead qualification stages
- Clean, professional interface design

## API Endpoints Integration

### Authentication Endpoints
- **POST** `/api/auth/signup` - Create new user and company
- **POST** `/api/auth/signin` - Authenticate existing user
- **GET** `/api/health` - API health check

### Lead Management Endpoints  
- **POST** `/api/leads` - Create new lead
- **GET** `/api/leads/:id` - Get specific lead details

## Environment Configuration

Required environment variables in `.env`:
```
VITE_SUPABASE_URL=https://kwebsccgtmntljdrzwet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=https://lqs-uat-worker.charlesheflin.workers.dev
```

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation & Running
```bash
# Clone repository
git clone https://github.com/sygnalz/lqs-monorepo.git
cd lqs-monorepo/apps/client-ui

# Install dependencies
npm install

# Start development server
npm run dev
# OR use PM2 for daemon mode
pm2 start ecosystem.config.cjs

# Build for production
npm run build
```

## User Guide

### For End Users
1. **Sign Up**: Create account with email, password, and company name
2. **Sign In**: Use credentials to access dashboard
3. **Create Leads**: Fill out lead form with name, email, phone, and source
4. **Monitor Status**: Watch leads automatically progress through qualification stages
5. **Track Progress**: View all leads with timestamps and current status

### For Developers
1. **API Health**: Monitor real-time API connectivity in dashboard
2. **UAT Testing**: Use "Fill UAT Credentials" button for quick testing
3. **Error Handling**: All API calls include proper error handling and user feedback
4. **Responsive Design**: Interface works on desktop, tablet, and mobile devices

## Known UAT Credentials
- **Email**: uat-owner-a@example.com  
- **Password**: TestPassword123!

## Lead Qualification Flow
1. **Create**: User submits lead through form
2. **New Status**: Lead initially marked as "new"
3. **Background Processing**: Automated qualification runs every 60-90 seconds
4. **Status Update**: Lead status updated to "qualified", "unqualified", "contacted", or "converted"
5. **Real-time Display**: Dashboard shows updated status automatically

## Technical Implementation Details

### Authentication Flow
1. User submits credentials via form
2. Frontend calls `/api/auth/signin` or `/api/auth/signup`
3. Backend returns JWT token and user data
4. Token stored in localStorage
5. Axios interceptor adds token to all subsequent requests
6. 401 responses trigger automatic logout and redirect

### Component Architecture
```
src/
├── components/           # React components
│   ├── SignIn.tsx       # Authentication form
│   ├── SignUp.tsx       # Registration form  
│   ├── Dashboard.tsx    # Main application interface
│   ├── HealthCheck.tsx  # API status monitoring
│   └── ProtectedRoute.tsx # Route guard
├── contexts/            # React context providers
│   └── AuthContext.tsx  # Authentication state
├── services/           # API service layers
│   ├── auth.ts         # Authentication API calls
│   └── leads.ts        # Lead management API calls
├── types/              # TypeScript definitions
│   ├── auth.ts         # Auth-related types
│   └── lead.ts         # Lead-related types
└── lib/               # Utility libraries
    ├── api.ts         # Axios client configuration
    └── supabase.ts    # Supabase client setup
```

## Deployment Status
- **Development**: ✅ Active (Vite dev server)
- **Staging**: ❌ Not deployed
- **Production**: ❌ Not deployed
- **Tech Stack**: React + TypeScript + Tailwind CSS + Vite
- **Last Updated**: September 6, 2025

## Next Development Steps
1. **Enhanced Lead Management**: Add lead editing, deletion, and bulk operations
2. **Advanced Filtering**: Implement search, sort, and filter functionality
3. **Data Visualization**: Add charts and analytics for lead pipeline
4. **Real-time Updates**: Implement WebSocket for live status updates
5. **Export Features**: Add CSV/PDF export capabilities
6. **User Management**: Company admin features for multi-user organizations
7. **Production Deployment**: Deploy to Cloudflare Pages or similar platform

## Development Notes
- All API integrations tested and verified with UAT backend
- Responsive design optimized for desktop and mobile
- Error handling implemented throughout the application
- TypeScript provides full type safety
- Tailwind CSS ensures consistent styling
- PM2 ecosystem configuration for daemon process management