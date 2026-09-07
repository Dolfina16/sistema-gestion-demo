import { db, latency, newId } from "../../demo/db"

export type AppUser = {
  id: string
  email: string
  nombre: string | null
  rol: string
}

export type NewUser = {
  email: string
  password: string
  nombre: string
  rol: "socio" | "administrativo"
}

// En producción esto vive en una Edge Function con la `service_role` de Supabase,
// porque crear usuarios y resetear contraseñas requiere privilegios de admin que
// nunca pueden viajar al bundle del cliente. Acá se resuelve contra la tabla en
// memoria, replicando las mismas validaciones de negocio.

export async function listUsers(): Promise<AppUser[]> {
  const rows = db.usuarios.map((u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
  }))
  return latency(rows)
}

export async function createUser(input: NewUser): Promise<void> {
  const email = input.email.trim().toLowerCase()

  if (db.usuarios.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("Ya existe un usuario con ese email.")
  }
  if (input.password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.")
  }

  db.usuarios.push({
    id: newId("us"),
    email,
    nombre: input.nombre.trim(),
    rol: input.rol,
    password: input.password,
  })

  return latency(undefined, 400)
}

export async function resetUserPassword(
  userId: string,
  password: string,
  currentPassword: string
): Promise<void> {
  const target = db.usuarios.find((u) => u.id === userId)
  if (!target) throw new Error("No se encontró el usuario.")

  // La Edge Function real revalida la contraseña de quien llama antes de tocar
  // nada; se replica el chequeo para que la demo tenga el mismo comportamiento.
  const caller = db.usuarios.find((u) => u.password === currentPassword)
  if (!caller) throw new Error("La contraseña actual es incorrecta.")

  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.")
  }

  target.password = password
  return latency(undefined, 400)
}
