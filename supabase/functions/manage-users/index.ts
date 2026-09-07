// Edge Function: manage-users
// Gestión de usuarios (crear, resetear contraseña, listar) con service_role.
// La service_role vive SOLO acá (secreta en Supabase), nunca en el frontend.
// Requiere que el llamador esté autenticado (JWT válido de un usuario logueado).
//
// Deploy:  supabase functions deploy manage-users
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY se inyectan solos)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // Cliente admin (service_role) — bypassa RLS, hace las operaciones privilegiadas.
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verificar que quien llama es un usuario logueado (JWT válido).
    const authHeader = req.headers.get("Authorization") ?? ""
    const jwt = authHeader.replace("Bearer ", "").trim()
    if (!jwt) return json({ error: "No autorizado." }, 200)
    const { data: caller, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !caller?.user) return json({ error: "No autorizado." }, 200)

    const body = await req.json().catch(() => ({}))
    const action = body?.action as string

    // ── Listar usuarios (perfiles + email) ──
    if (action === "list") {
      const { data: profiles, error } = await admin.from("profiles").select("id, nombre, rol")
      if (error) return json({ error: error.message })
      const { data: list } = await admin.auth.admin.listUsers()
      const emailById = new Map((list?.users ?? []).map((u) => [u.id, u.email]))
      const users = (profiles ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        rol: p.rol,
        email: emailById.get(p.id) ?? "",
      }))
      return json({ users })
    }

    // ── Crear usuario ──
    if (action === "create") {
      const { email, password, nombre, rol } = body
      if (!email || !password) return json({ error: "Faltan email o contraseña." })
      if (String(password).length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres." })

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // queda usable de una, sin confirmar por mail
      })
      if (error) return json({ error: error.message })

      // El trigger crea el perfil (nombre=email, rol=administrativo). Lo ajustamos.
      await admin
        .from("profiles")
        .update({ nombre: nombre?.trim() || email, rol: rol === "socio" ? "socio" : "administrativo" })
        .eq("id", created.user.id)

      return json({ ok: true, id: created.user.id })
    }

    // ── Cambiar contraseña de un usuario (conociendo la actual) ──
    if (action === "reset-password") {
      const { userId, password, currentPassword } = body
      if (!userId || !password) return json({ error: "Faltan datos." })
      if (String(password).length < 6) return json({ error: "La nueva contraseña debe tener al menos 6 caracteres." })
      if (!currentPassword) return json({ error: "Ingresá la contraseña actual del usuario." })

      // Email del usuario objetivo
      const { data: target, error: targetErr } = await admin.auth.admin.getUserById(userId)
      if (targetErr || !target?.user?.email) return json({ error: "Usuario no encontrado." })

      // Verificar la contraseña ACTUAL del usuario objetivo (re-login en cliente aparte,
      // no afecta ninguna sesión real).
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
      const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { error: reauthErr } = await anon.auth.signInWithPassword({
        email: target.user.email,
        password: String(currentPassword),
      })
      if (reauthErr) return json({ error: "La contraseña actual del usuario es incorrecta." })

      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message })
      return json({ ok: true })
    }

    return json({ error: "Acción desconocida." })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error inesperado." })
  }
})
