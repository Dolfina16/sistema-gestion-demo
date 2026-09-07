import { supabase } from "../../lib/supabase"

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

// Llama a la Edge Function `manage-users`. supabase.functions.invoke adjunta
// automáticamente el JWT del usuario logueado (Authorization). Los errores de
// negocio vuelven en el body como { error }.
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-users", { body })
  if (error) throw new Error(error.message || "No se pudo contactar el servicio de usuarios.")
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as T
}

export async function listUsers(): Promise<AppUser[]> {
  const { users } = await invoke<{ users: AppUser[] }>({ action: "list" })
  return users
}

export async function createUser(input: NewUser): Promise<void> {
  await invoke({
    action: "create",
    email: input.email.trim(),
    password: input.password,
    nombre: input.nombre.trim(),
    rol: input.rol,
  })
}

export async function resetUserPassword(
  userId: string,
  password: string,
  currentPassword: string
): Promise<void> {
  await invoke({ action: "reset-password", userId, password, currentPassword })
}
