import type { Guest } from "../../types/guest"
import { db, latency, newId, nowIso } from "../../demo/db"

export type BillingResult = {
  guestId: string
  guestName: string
  status: "created" | "already_exists" | "error"
  error?: string
}

export type BillingEstado = "pendiente" | "facturado" | "enviado"

export async function fetchBillingStatuses(
  period: string
): Promise<Record<string, BillingEstado>> {
  const periodo = `${period}-01`
  const map: Record<string, BillingEstado> = {}
  for (const r of db.facturacion_estado.filter((s) => s.periodo === periodo)) {
    map[r.huesped_id] = r.estado
  }
  return latency(map)
}

export async function upsertBillingStatuses(
  period: string,
  entries: { huesped_id: string; estado: BillingEstado }[]
): Promise<void> {
  if (entries.length === 0) return
  const periodo = `${period}-01`

  for (const e of entries) {
    const existing = db.facturacion_estado.find(
      (s) => s.huesped_id === e.huesped_id && s.periodo === periodo
    )
    if (existing) existing.estado = e.estado
    else db.facturacion_estado.push({ huesped_id: e.huesped_id, periodo, estado: e.estado })
  }

  return latency(undefined)
}

// Idempotente igual que en la base real: la clave es (huésped, período, concepto).
// Volver a correr la facturación del mismo mes no duplica la cuota.
export async function generateMonthlyCharges(
  guests: Guest[],
  period: string
): Promise<BillingResult[]> {
  const periodDate = `${period}-01`
  const results: BillingResult[] = []

  for (const guest of guests) {
    const guestName = `${guest.apellido}, ${guest.nombre}`

    if (!guest.cuota_mensual || guest.cuota_mensual <= 0) {
      results.push({
        guestId: guest.id,
        guestName,
        status: "error",
        error: "Sin cuota mensual configurada",
      })
      continue
    }

    const existing = db.ingresos.find(
      (i) =>
        i.huesped_id === guest.id &&
        i.periodo === periodDate &&
        i.concepto === "Cuota mensual"
    )

    if (existing) {
      results.push({ guestId: guest.id, guestName, status: "already_exists" })
      continue
    }

    db.ingresos.push({
      id: newId("in"),
      huesped_id: guest.id,
      periodo: periodDate,
      importe: guest.cuota_mensual,
      concepto: "Cuota mensual",
      created_at: nowIso(),
      updated_at: nowIso(),
    })

    results.push({ guestId: guest.id, guestName, status: "created" })
  }

  return latency(results, 400)
}

export type FeeUpdateResult = {
  id: string
  nombre: string
  apellido: string
  contacto_nombre?: string
  contacto_email?: string
  cuotaAnterior: number
  cuotaNueva: number
}

export async function updateMonthlyFees(
  guestIds: string[],
  mode: "percentage" | "fixed",
  value: number
): Promise<FeeUpdateResult[]> {
  if (guestIds.length === 0) return []

  const results: FeeUpdateResult[] = []
  for (const g of db.huespedes.filter((h) => guestIds.includes(h.id))) {
    const prev = Number(g.cuota_mensual ?? 0)
    const next = mode === "fixed" ? value : Math.round(prev * (1 + value / 100))
    g.cuota_mensual = next
    g.updated_at = nowIso()

    results.push({
      id: g.id,
      nombre: g.nombre,
      apellido: g.apellido,
      contacto_nombre: g.contacto_nombre,
      contacto_email: g.contacto_email,
      cuotaAnterior: prev,
      cuotaNueva: next,
    })
  }

  return latency(results, 400)
}
