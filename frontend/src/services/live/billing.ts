import { supabase } from "../../lib/supabase"
import type { Guest } from "../../types/guest"

export type BillingResult = {
  guestId: string
  guestName: string
  status: "created" | "already_exists" | "error"
  error?: string
}

// Estado de facturación mensual por huésped (persiste por período).
export type BillingEstado = "pendiente" | "facturado" | "enviado"

// Trae el estado de cada huésped para el período (huesped_id → estado).
export async function fetchBillingStatuses(
  period: string
): Promise<Record<string, BillingEstado>> {
  const periodo = `${period}-01`
  const { data, error } = await supabase
    .from("facturacion_estado")
    .select("huesped_id, estado")
    .eq("periodo", periodo)
  if (error) throw error
  const map: Record<string, BillingEstado> = {}
  for (const r of data ?? []) map[r.huesped_id as string] = r.estado as BillingEstado
  return map
}

// Guarda/actualiza el estado de varios huéspedes para el período (upsert).
export async function upsertBillingStatuses(
  period: string,
  entries: { huesped_id: string; estado: BillingEstado }[]
): Promise<void> {
  if (entries.length === 0) return
  const periodo = `${period}-01`
  const now = new Date().toISOString()
  const rows = entries.map((e) => ({
    huesped_id: e.huesped_id,
    periodo,
    estado: e.estado,
    updated_at: now,
  }))
  const { error } = await supabase
    .from("facturacion_estado")
    .upsert(rows, { onConflict: "huesped_id,periodo" })
  if (error) throw error
}

export async function generateMonthlyCharges(
  guests: Guest[],
  period: string
): Promise<BillingResult[]> {
  const periodDate = `${period}-01`
  const results: BillingResult[] = []

  for (const guest of guests) {
    if (!guest.cuota_mensual || guest.cuota_mensual <= 0) {
      results.push({
        guestId: guest.id,
        guestName: `${guest.apellido}, ${guest.nombre}`,
        status: "error",
        error: "Sin cuota mensual configurada"
      })
      continue
    }

    const { data: existing } = await supabase
      .from("ingresos")
      .select("id")
      .eq("huesped_id", guest.id)
      .eq("periodo", periodDate)
      .eq("concepto", "Cuota mensual")
      .maybeSingle()

    if (existing) {
      results.push({
        guestId: guest.id,
        guestName: `${guest.apellido}, ${guest.nombre}`,
        status: "already_exists"
      })
      continue
    }

    const { error } = await supabase.from("ingresos").insert({
      huesped_id: guest.id,
      periodo: periodDate,
      importe: guest.cuota_mensual,
      concepto: "Cuota mensual"
    })

    results.push({
      guestId: guest.id,
      guestName: `${guest.apellido}, ${guest.nombre}`,
      status: error ? "error" : "created",
      error: error?.message
    })
  }

  return results
}

// Resultado de una actualización de cuota (para notificar el aumento por mail).
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

  // Traer datos actuales: se necesita la cuota previa para calcular y para el mail.
  const { data: guests, error: fetchErr } = await supabase
    .from("huespedes")
    .select("id, nombre, apellido, contacto_nombre, contacto_email, cuota_mensual")
    .in("id", guestIds)
  if (fetchErr) throw fetchErr

  const results: FeeUpdateResult[] = []
  for (const g of guests ?? []) {
    const prev = Number(g.cuota_mensual ?? 0)
    const next = mode === "fixed" ? value : Math.round(prev * (1 + value / 100))
    const { error } = await supabase
      .from("huespedes")
      .update({ cuota_mensual: next })
      .eq("id", g.id)
    if (error) throw error
    results.push({
      id: g.id,
      nombre: g.nombre,
      apellido: g.apellido,
      contacto_nombre: g.contacto_nombre ?? undefined,
      contacto_email: g.contacto_email ?? undefined,
      cuotaAnterior: prev,
      cuotaNueva: next,
    })
  }
  return results
}
