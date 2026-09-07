// Contrato de autenticación que consume la app.
//
// Deliberadamente NO expone los tipos `Session`/`User` de @supabase/supabase-js:
// la UI solo necesita saber quién está logueado y con qué rol, y atarla al SDK
// haría imposible correrla contra otro backend (como el de la demo).

export type UserRole = "socio" | "administrativo"

export type AuthUser = {
  id: string
  email: string
}

export type AuthSession = {
  user: AuthUser
  role: UserRole | null
}

// `PASSWORD_RECOVERY` llega cuando el usuario entra por un link de recuperación:
// hay sesión, pero lo único que corresponde mostrarle es el cambio de contraseña.
export type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "PASSWORD_RECOVERY"

export type AuthResult = { error: string | null }

export type AuthBackend = {
  getSession(): Promise<AuthSession | null>
  /** Registra un listener de cambios de sesión. Devuelve la función para darlo de baja. */
  subscribe(cb: (session: AuthSession | null, event: AuthEvent) => void): () => void
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<AuthResult>
  updatePassword(password: string): Promise<AuthResult>
}
