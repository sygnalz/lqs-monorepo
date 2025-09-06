import React, { useState, useEffect } from 'react'
import { authService } from '../services/auth'

const HealthCheck: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<string>('Checking...')
  const [lastCheck, setLastCheck] = useState<string>('')

  const checkApiHealth = async () => {
    try {
      const response = await authService.checkHealth()
      setApiStatus(`✅ API Connected - Status: ${response.status}`)
      setLastCheck(new Date(response.timestamp).toLocaleString())
    } catch (error) {
      setApiStatus(`❌ API Connection Failed - ${error}`)
      setLastCheck(new Date().toLocaleString())
    }
  }

  useEffect(() => {
    checkApiHealth()
    const interval = setInterval(checkApiHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">API Health Status</h3>
      <div className="text-sm">
        <p className="mb-1">{apiStatus}</p>
        <p className="text-gray-600">Last checked: {lastCheck}</p>
        <p className="text-gray-500 text-xs mt-2">
          API Base URL: {import.meta.env.VITE_API_BASE_URL}
        </p>
        <button
          onClick={checkApiHealth}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          Check Now
        </button>
      </div>
    </div>
  )
}

export default HealthCheck