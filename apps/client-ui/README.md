# LQS Phase 14 - Frontend Application

A React + TypeScript + Vite application with authentication and protected routing for the Lead Qualification System (LQS).

## Features

- **Authentication Flow**: Complete sign-up and sign-in functionality
- **Protected Routing**: Dashboard accessible only after authentication
- **Backend Integration**: Connects to LQS UAT Worker API
- **Modern Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: Pre-built shadcn/ui components

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager

## Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

3. **Backend Configuration**
   The application is configured to connect to the UAT backend:
   ```
   API URL: https://lqs-uat-worker.charlesheflin.workers.dev/api
   ```

## Authentication Flow

1. **Sign Up**: Create new account with company name, email, and password
2. **Sign In**: Authenticate with email and password
3. **Dashboard**: Access protected client management interface
4. **Logout**: Clear session and return to sign-in

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── SignIn.tsx      # Sign-in page component
│   ├── SignUp.tsx      # Sign-up page component
│   ├── Dashboard.tsx   # Protected dashboard component
│   └── ProtectedRoute.tsx # Route protection wrapper
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── services/           # API services
│   └── auth.ts         # Authentication service
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Testing

Run E2E tests to verify authentication workflow:
```bash
npx playwright test e2e-tests/phase14-auth-workflow.spec.js
```

## Backend API Integration

The application integrates with the following authentication endpoints:
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Authenticate user

Authentication tokens are stored in localStorage and included in API requests via Authorization header.
