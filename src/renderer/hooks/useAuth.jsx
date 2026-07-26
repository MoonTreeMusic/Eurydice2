import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [isCertAuth, setIsCertAuth] = useState(false)
  const [initError, setInitError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        await apiClient.initialize()
        const acc = apiClient.getAccount()
        const isCert = apiClient.useCertAuth
        setIsCertAuth(isCert)

        if (isCert) {
          setIsAuthenticated(apiClient.isAuthenticated())
          setAccount({ name: 'App Identity (Cert Auth)', username: 'cert-auth' })
        } else if (acc) {
          setAccount(acc)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('[Auth] Initialization failed:', error.message || error)
        setInitError(error.message || 'Authentication initialization failed. Check console for details.')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const login = useCallback(async () => {
    try {
      const success = await apiClient.login()
      if (success) {
        const acc = apiClient.getAccount()
        if (acc) {
          setAccount(acc)
        }
        setIsAuthenticated(true)
      }
      return success
    } catch (error) {
      console.error('Login callback error:', error)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setAccount(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, account, login, logout, isCertAuth, initError }}>
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