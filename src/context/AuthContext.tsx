import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMe, loginUser, registerUser, type RegisterPayload } from '@/lib/api'
import { unsubscribeThisDevice } from '@/lib/alertsLive'
import type { User } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => void
  /** true once the profile has been confirmed by the server this visit */
  verified: boolean
  setUser: (u: User) => void
  refreshUser: () => Promise<void>
  setSessionToken: (t: string) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [verified, setVerified] = useState(false)

  function persist(token: string, user: User) {
    localStorage.setItem('nexhood_token', token)
    localStorage.setItem('nexhood_user', JSON.stringify(user))
    setToken(token)
    setUserState(user)
  }

  // After a password change the server issues a fresh token (old ones stop working).
  function setSessionToken(t: string) {
    localStorage.setItem('nexhood_token', t)
    setToken(t)
  }

  function setUser(u: User) {
    localStorage.setItem('nexhood_user', JSON.stringify(u))
    setUserState(u)
  }

  // Re-fetches the full profile from the server and reconciles local cache.
  // Used on boot and after login/register so a stale or incomplete cached
  // user (e.g. missing estate_name from an older API response) self-heals
  // without the person having to log out and back in.
  async function refreshUser() {
    try {
      const fresh = await fetchMe()
      setUser(fresh)
      setVerified(true)
    } catch {
      // If the token is invalid the axios interceptor already handles
      // redirecting to /login; nothing extra to do here.
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('nexhood_token')
    const storedUser = localStorage.getItem('nexhood_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        setUserState(JSON.parse(storedUser))
      } catch {
        // corrupted cache, ignore
      }
      setIsLoading(false)
      refreshUser()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email: string, password: string) {
    const { token, user } = await loginUser(email, password)
    persist(token, user)
    refreshUser()
    return user
  }

  async function register(payload: RegisterPayload) {
    const { token, user } = await registerUser(payload)
    persist(token, user)
    refreshUser()
    return user
  }

  function logout() {
    // Fire-and-forget: the request still carries this account's token.
    unsubscribeThisDevice(localStorage.getItem('nexhood_token'))
    setVerified(false)
    localStorage.removeItem('nexhood_token')
    localStorage.removeItem('nexhood_user')
    setToken(null)
    setUserState(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, verified, setUser, refreshUser, setSessionToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
