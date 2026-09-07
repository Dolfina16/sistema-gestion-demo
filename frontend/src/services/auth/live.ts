import { supabase } from "../../lib/supabase"
import type { AuthBackend, AuthSession, UserRole } from "./types"

// El rol no vive en `auth.users` sino en la tabla `profiles` (1:1 con el usuario),
// que es la que leen las políticas RLS. Ocultar opciones en la UI según el rol es
// cosmético: la barrera real está en la base.
async function fetchRole(userId: string): Promise<UserRole | null> {
  const { data } = await supabase.from("profiles").select("rol").eq("id", userId).single()
  return (data?.rol as UserRole) ?? null
}

async function toSession(
  session: { user: { id: string; email?: string } } | null
): Promise<AuthSession | null> {
  if (!session?.user) return null
  return {
    user: { id: session.user.id, email: session.user.email ?? "" },
    role: await fetchRole(session.user.id),
  }
}

export const liveAuth: AuthBackend = {
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return toSession(data.session)
  },

  subscribe(cb) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const mapped = await toSession(session)
      cb(mapped, event === "PASSWORD_RECOVERY" ? "PASSWORD_RECOVERY" : mapped ? "SIGNED_IN" : "SIGNED_OUT")
    })
    return () => subscription.unsubscribe()
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error: error ? "No se pudo enviar el mail de recuperación." : null }
  },

  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? error.message : null }
  },
}
