import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { auth } from "../services/auth"
import type { AuthResult, AuthSession, AuthUser, UserRole } from "../services/auth"

export type { UserRole }

interface AuthContextValue {
  session: AuthSession | null
  user: AuthUser | null
  role: UserRole | null
  loading: boolean
  recovery: boolean // true cuando el usuario entró por un link de recuperación de contraseña
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  endRecovery: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    let active = true

    auth.getSession().then((s) => {
      if (!active) return
      setSession(s)
      setLoading(false)
    })

    const unsubscribe = auth.subscribe((s, event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true)
      setSession(s)
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function signOut() {
    setRecovery(false)
    await auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role: session?.role ?? null,
        loading,
        recovery,
        signIn: auth.signIn,
        signOut,
        requestPasswordReset: auth.requestPasswordReset,
        updatePassword: auth.updatePassword,
        endRecovery: () => setRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
