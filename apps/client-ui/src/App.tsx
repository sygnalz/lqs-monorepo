import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SignIn from './components/SignIn'
import SignUp from './components/SignUp'
import Dashboard from './components/Dashboard'
import NewLead from './components/NewLead'
import LeadDetail from './components/LeadDetail'
import CreateClient from './components/CreateClient'
import ClientDetailPage from './pages/ClientDetailPage'
import CreateLeadPage from './pages/CreateLeadPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ProspectDetailPage from './pages/ProspectDetailPage'
import PlaybooksPage from './pages/PlaybooksPage'
import InitiativesPage from './pages/InitiativesPage'
import InitiativeDetail from './components/InitiativeDetail'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leads/new" 
            element={
              <ProtectedRoute>
                <NewLead />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leads/:id" 
            element={
              <ProtectedRoute>
                <LeadDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients/new" 
            element={
              <ProtectedRoute>
                <CreateClient />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients/:clientId/leads/new" 
            element={
              <ProtectedRoute>
                <CreateLeadPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients/:id" 
            element={
              <ProtectedRoute>
                <ClientDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/playbooks" 
            element={
              <ProtectedRoute>
                <PlaybooksPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/initiatives" 
            element={
              <ProtectedRoute>
                <InitiativesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/initiatives/:id" 
            element={
              <ProtectedRoute>
                <InitiativeDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/prospect/:prospectId" 
            element={
              <ProtectedRoute>
                <ProspectDetailPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
