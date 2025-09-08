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
            path="/clients/:id" 
            element={
              <ProtectedRoute>
                <ClientDetailPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App