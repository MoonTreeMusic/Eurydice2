import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [account, setAccount] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        await apiClient.initialize()
        const acc = apiClient.getAccount()
        if (acc) {
          setAccount(acc)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('MSAL initialization failed:', error)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const login = useCallback(async () => {
    const success = await apiClient.login()
    if (success) {
      setAccount(apiClient.getAccount())
      setIsAuthenticated(true)
    }
    return success
  }, [])

  const logout = useCallback(() => {
    setAccount(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, account, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export { apiClient }