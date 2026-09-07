import { db, latency } from "../../demo/db"
import type { AuthBackend, AuthEvent, AuthSession } from "./types"

// Autenticación de la demo: valida contra los usuarios ficticios en memoria.
// No hay tokens ni JWT; la sesión se guarda en `sessionStorage` solamente para
// que un F5 no eche al visitante al login, igual que haría la app real. Se usa
// sessionStorage y no localStorage a propósito: al cerrar la pestaña se limpia.

const SESSION_KEY = "residencia.demo.session"

function readStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    // Modo incógnito o storage bloqueado: se sigue sin persistencia.
    return null
  }
}

function writeStoredSession(session: AuthSession | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignorado a propósito: la sesión sigue viva en memoria
  }
}

let current: AuthSession | null = readStoredSession()

const listeners = new Set<(s: AuthSession | null, e: AuthEvent) => void>()

function emit(session: AuthSession | null, event: AuthEvent): void {
  current = session
  writeStoredSession(session)
  for (const cb of listeners) cb(session, event)
}

export const demoAuth: AuthBackend = {
  async getSession() {
    return latency(current, 120)
  },

  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  async signIn(email, password) {
    await latency(undefined, 400)

    const user = db.usuarios.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    )
    if (!user || user.password !== password) {
      return { error: "Invalid login credentials" }
    }

    emit({ user: { id: user.id, email: user.email }, role: user.rol }, "SIGNED_IN")
    return { error: null }
  },

  async signOut() {
    await latency(undefined, 150)
    emit(null, "SIGNED_OUT")
  },

  async requestPasswordReset() {
    await latency(undefined, 400)
    // La recuperación real manda un mail desde Supabase Auth. En la demo no hay
    // casilla adonde mandarlo, así que se avisa en vez de simular un envío que
    // el visitante estaría esperando en vano.
    return { error: "En la demo no se envían mails. Usá las credenciales que figuran abajo." }
  },

  async updatePassword(password) {
    await latency(undefined, 300)
    if (!current) return { error: "No hay una sesión activa." }
    const user = db.usuarios.find((u) => u.id === current!.user.id)
    if (user) user.password = password
    return { error: null }
  },
}
