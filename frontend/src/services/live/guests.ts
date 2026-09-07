import { supabase } from "../../lib/supabase"
import type { Guest, GuestInsert, GuestUpdate } from "../../types/guest"

export async function fetchGuests(activeOnly = true): Promise<Guest[]> {
  let query = supabase.from("huespedes").select("*").order("apellido")
  if (activeOnly) query = query.eq("activo", true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createGuest(guest: GuestInsert): Promise<Guest> {
  const { data, error } = await supabase
    .from("huespedes")
    .insert(guest)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGuest(id: string, updates: GuestUpdate): Promise<Guest> {
  const { data, error } = await supabase
    .from("huespedes")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateGuest(id: string): Promise<Guest> {
  return updateGuest(id, {
    activo: false,
    fecha_baja: new Date().toISOString().split("T")[0]
  })
}
