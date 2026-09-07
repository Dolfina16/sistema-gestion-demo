import type { Guest, GuestInsert, GuestUpdate } from "../../types/guest"
import { db, latency, newId, nowIso } from "../../demo/db"

export async function fetchGuests(activeOnly = true): Promise<Guest[]> {
  const rows = db.huespedes
    .filter((g) => (activeOnly ? g.activo : true))
    .sort((a, b) => a.apellido.localeCompare(b.apellido, "es"))
  return latency(rows.map((g) => ({ ...g })))
}

export async function createGuest(guest: GuestInsert): Promise<Guest> {
  const row: Guest = {
    id: newId("hu"),
    nombre: guest.nombre,
    apellido: guest.apellido,
    cuit: guest.cuit,
    contacto: guest.contacto,
    contacto_nombre: guest.contacto_nombre,
    contacto_email: guest.contacto_email,
    contacto_telefono: guest.contacto_telefono,
    cobertura: guest.cobertura,
    cuota_mensual: guest.cuota_mensual ?? undefined,
    monto_exento: guest.monto_exento ?? undefined,
    fecha_alta: guest.fecha_alta ?? new Date().toISOString().split("T")[0],
    activo: guest.activo ?? true,
    observaciones: guest.observaciones,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  db.huespedes.push(row)
  return latency({ ...row })
}

export async function updateGuest(id: string, updates: GuestUpdate): Promise<Guest> {
  const row = db.huespedes.find((g) => g.id === id)
  if (!row) throw new Error("No se encontró el huésped.")

  // `null` en la capa de datos significa "limpiar la columna"; el tipo Guest usa
  // undefined para lo vacío, así que se traduce acá.
  Object.assign(row, {
    ...updates,
    cuota_mensual:
      updates.cuota_mensual === null ? undefined : updates.cuota_mensual ?? row.cuota_mensual,
    monto_exento:
      updates.monto_exento === null ? undefined : updates.monto_exento ?? row.monto_exento,
    updated_at: nowIso(),
  })

  return latency({ ...row })
}

export async function deactivateGuest(id: string): Promise<Guest> {
  return updateGuest(id, {
    activo: false,
    fecha_baja: new Date().toISOString().split("T")[0],
  })
}
