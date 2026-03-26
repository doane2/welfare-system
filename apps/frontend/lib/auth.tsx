'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TREASURER', 'SECRETARY']
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7  // 7 days

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  const secure   = location.protocol === 'https:' ? '; Secure' : ''
  const sameSite = '; SameSite=Lax'  // Lax instead of Strict — allows redirect navigation to send cookie
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}${secure}${sameSite}`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0`
}

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router                = useRouter()

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('welfare_token')
      const storedUser  = localStorage.getItem('welfare_user')

      if (!storedToken || !storedUser) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/profile`,
          { headers: { Authorization: `Bearer ${storedToken}` } }
        )

        if (!res.ok) {
          clearAuth()
          setLoading(false)
          return
        }

        const { user: verifiedUser } = await res.json()
        localStorage.setItem('welfare_user', JSON.stringify(verifiedUser))
        setCookie('welfare_token', storedToken)
        setCookie('welfare_role',  verifiedUser.role)
        setUser(verifiedUser)
      } catch {
        // Network error — use cached user
        try {
          const cached = JSON.parse(storedUser)
          setUser(cached)
          setCookie('welfare_token', storedToken)
          setCookie('welfare_role',  cached.role || '')
        } catch {}
      }

      setLoading(false)
    }

    init()
  }, [])

  const clearAuth = () => {
    localStorage.removeItem('welfare_token')
    localStorage.removeItem('welfare_user')
    deleteCookie('welfare_token')
    deleteCookie('welfare_role')
    setUser(null)
  }

  const signIn = (token: string, userData: any) => {
    // 1. Store in localStorage
    localStorage.setItem('welfare_token', token)
    localStorage.setItem('welfare_user',  JSON.stringify(userData))

    // 2. Set cookies BEFORE navigation so proxy.ts can read them
    setCookie('welfare_token', token)
    setCookie('welfare_role',  userData.role)

    // 3. Update React state
    setUser(userData)

    // 4. Navigate — use window.location.href instead of router.push
    //    This does a full page navigation so the browser sends the
    //    newly set cookie with the request, which proxy.ts can read
    const dest = ADMIN_ROLES.includes(userData.role) ? '/admin' : '/dashboard'
    window.location.href = dest
  }

  const signOut = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
