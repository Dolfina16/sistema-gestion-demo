import { supabase } from "../../lib/supabase"
import type {
  Outflow,
  OutflowInsert,
  PurchaseInsert,
  SalaryInsert,
  TaxInsert,
  WithdrawalInsert
} from "../../types/outflow"

const OUTFLOW_SELECT = `
  *,
  metodos_pago(nombre),
  gastos(egreso_id, concepto, rubro_id, proveedor_id, rubros(nombre), proveedores(nombre)),
  sueldos(egreso_id, legajo, periodo, sueldo_base, presentismo, horas_extra, pasaje, bono),
  impuestos(egreso_id, concepto),
  retiros(egreso_id, socio_id, origen)
`

export async function fetchOutflows(month?: string): Promise<Outflow[]> {
  let query = supabase
    .from("egresos")
    .select(OUTFLOW_SELECT)
    .order("fecha_emision", { ascending: false })

  if (month) {
    const start = `${month}-01`
    const end = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1))
      .toISOString()
      .split("T")[0]
    query = query.gte("fecha_emision", start).lt("fecha_emision", end)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Outflow[]
}

export async function createPurchaseExpense(
  outflow: OutflowInsert,
  detail: PurchaseInsert
): Promise<Outflow> {
  const { data: created, error: e1 } = await supabase
    .from("egresos")
    .insert({ ...outflow, tipo: "GASTO" })
    .select()
    .single()
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from("gastos")
    .insert({ egreso_id: created.id, ...detail })
  if (e2) throw e2

  return created
}

export async function createSalaryExpense(
  outflow: OutflowInsert,
  detail: SalaryInsert
): Promise<Outflow> {
  const { data: created, error: e1 } = await supabase
    .from("egresos")
    .insert({ ...outflow, tipo: "SUELDO" })
    .select()
    .single()
  if (e1) throw e1

  // Si el detalle falla (error de la base O corte de red), borramos el egreso recién
  // creado para no dejar un SUELDO huérfano sin detalle. El try cubre ambos casos:
  // PostgrestError (e2) y el reject de fetch ("Failed to fetch").
  try {
    const { error: e2 } = await supabase
      .from("sueldos")
      .insert({ egreso_id: created.id, ...detail })
    if (e2) throw e2
  } catch (err) {
    await supabase.from("egresos").delete().eq("id", created.id).then(undefined, () => {})
    throw err
  }

  return created
}

// Una contribución patronal a guardar como IMPUESTO pendiente.
export type ContributionInsert = { concepto: string; importe: number }

// Guarda el sueldo (con su detalle) y, en el mismo paso, las contribuciones patronales
// como egresos IMPUESTO **pendientes** (sin fecha_pago ni método). Es atómico a mano:
// si falla cualquier contribución, borra las ya creadas y el sueldo, así se puede
// reintentar sin duplicar. Sólo se guardan contribuciones con importe > 0.
export async function createSalaryWithContributions(
  outflow: OutflowInsert,
  salary: SalaryInsert,
  contribuciones: ContributionInsert[]
): Promise<Outflow> {
  const created = await createSalaryExpense(outflow, salary)

  const validas = contribuciones.filter((c) => c.importe > 0 && c.concepto.trim())
  const createdTaxIds: string[] = []
  try {
    for (const c of validas) {
      const { data, error: e1 } = await supabase
        .from("egresos")
        .insert({
          tipo: "IMPUESTO",
          fecha_emision: outflow.fecha_emision, // mismo devengamiento que el sueldo
          importe: c.importe
          // sin fecha_pago ni metodo_pago_id → queda PENDIENTE
        })
        .select()
        .single()
      if (e1) throw e1
      createdTaxIds.push(data.id)

      const { error: e2 } = await supabase
        .from("impuestos")
        .insert({ egreso_id: data.id, concepto: c.concepto })
      if (e2) throw e2
    }
  } catch (err) {
    // rollback: borrar las contribuciones creadas y el sueldo, para reintentar limpio
    for (const id of createdTaxIds) {
      await supabase.from("impuestos").delete().eq("egreso_id", id).then(undefined, () => {})
      await supabase.from("egresos").delete().eq("id", id).then(undefined, () => {})
    }
    await deleteOutflow(created.id, "SUELDO").catch(() => {})
    throw err
  }

  return created
}

export async function createTaxExpense(
  outflow: OutflowInsert,
  detail: TaxInsert
): Promise<Outflow> {
  const { data: created, error: e1 } = await supabase
    .from("egresos")
    .insert({ ...outflow, tipo: "IMPUESTO" })
    .select()
    .single()
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from("impuestos")
    .insert({ egreso_id: created.id, ...detail })
  if (e2) throw e2

  return created
}

export async function createWithdrawal(
  outflow: OutflowInsert,
  detail: WithdrawalInsert
): Promise<Outflow> {
  const { data: created, error: e1 } = await supabase
    .from("egresos")
    .insert({
      ...outflow,
      tipo: "RETIRO",
      // retiros son pagos inmediatos — fecha_pago = fecha_emision para que aparezcan en caja
      fecha_pago: outflow.fecha_pago ?? outflow.fecha_emision,
    })
    .select()
    .single()
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from("retiros")
    .insert({ egreso_id: created.id, ...detail })
  if (e2) throw e2

  return created
}

export async function markAsPaid(
  outflowId: string,
  paymentDate: string,
  paymentMethodId: string
): Promise<void> {
  const { error } = await supabase
    .from("egresos")
    .update({ fecha_pago: paymentDate, metodo_pago_id: paymentMethodId })
    .eq("id", outflowId)
  if (error) throw error
}

export async function updatePurchaseExpense(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: PurchaseInsert
): Promise<void> {
  const { error: e1 } = await supabase.from("egresos").update(outflow).eq("id", id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from("gastos").update(detail).eq("egreso_id", id)
  if (e2) throw e2
}

export async function updateSalaryExpense(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: SalaryInsert
): Promise<void> {
  const { error: e1 } = await supabase.from("egresos").update(outflow).eq("id", id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from("sueldos").update(detail).eq("egreso_id", id)
  if (e2) throw e2
}

export async function updateTaxExpense(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: TaxInsert
): Promise<void> {
  const { error: e1 } = await supabase.from("egresos").update(outflow).eq("id", id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from("impuestos").update(detail).eq("egreso_id", id)
  if (e2) throw e2
}

export async function updateWithdrawal(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: WithdrawalInsert
): Promise<void> {
  const { error: e1 } = await supabase.from("egresos").update(outflow).eq("id", id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from("retiros").update(detail).eq("egreso_id", id)
  if (e2) throw e2
}

const DETAIL_TABLE: Record<string, string> = {
  GASTO: "gastos",
  SUELDO: "sueldos",
  IMPUESTO: "impuestos",
  RETIRO: "retiros",
}

export async function deleteOutflow(outflowId: string, tipo: string): Promise<void> {
  const detailTable = DETAIL_TABLE[tipo]
  if (detailTable) {
    const { error: e1 } = await supabase.from(detailTable).delete().eq("egreso_id", outflowId)
    if (e1) throw e1
  }
  const { error } = await supabase.from("egresos").delete().eq("id", outflowId)
  if (error) throw error
}
