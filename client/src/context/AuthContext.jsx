import { createContext, useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Carica utente dal token salvato
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await api.get('/auth/me')
        setUser(res.data.data.user)
      } catch (err) {
        console.error('Errore caricamento utente:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: newToken, data } = res.data

    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(data.user)

    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isCliente: user?.ruolo === 'cliente',
    isConsulente: user?.ruolo === 'consulente',
    isSuperAdmin: user?.ruolo === 'super_admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
