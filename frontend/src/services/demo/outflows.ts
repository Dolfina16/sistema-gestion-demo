import type {
  Outflow,
  OutflowInsert,
  PurchaseInsert,
  SalaryInsert,
  TaxInsert,
  WithdrawalInsert,
} from "../../types/outflow"
import type { OutflowRow } from "../../demo/dataset"
import { db, hydrateOutflow, latency, newId, nowIso } from "../../demo/db"

// Crea la fila plana de `egresos` (sin el detalle por tipo).
function insertOutflowRow(outflow: OutflowInsert, tipo: OutflowRow["tipo"]): OutflowRow {
  const row: OutflowRow = {
    id: newId("eg"),
    tipo,
    fecha_emision: outflow.fecha_emision,
    fecha_vencimiento: outflow.fecha_vencimiento,
    fecha_pago: outflow.fecha_pago ?? undefined,
    importe: outflow.importe,
    metodo_pago_id: outflow.metodo_pago_id ?? undefined,
    comprobante: outflow.comprobante,
    observaciones: outflow.observaciones,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  db.egresos.push(row)
  return row
}

// Aplica un update parcial respetando la convención de `null` = limpiar columna.
function applyOutflowUpdate(row: OutflowRow, updates: Partial<OutflowInsert>): void {
  if (updates.fecha_emision !== undefined) row.fecha_emision = updates.fecha_emision
  if (updates.fecha_vencimiento !== undefined) row.fecha_vencimiento = updates.fecha_vencimiento
  if (updates.importe !== undefined) row.importe = updates.importe
  if (updates.comprobante !== undefined) row.comprobante = updates.comprobante
  if (updates.observaciones !== undefined) row.observaciones = updates.observaciones
  if (updates.fecha_pago !== undefined) row.fecha_pago = updates.fecha_pago ?? undefined
  if (updates.metodo_pago_id !== undefined) row.metodo_pago_id = updates.metodo_pago_id ?? undefined
  row.updated_at = nowIso()
}

function requireRow(id: string): OutflowRow {
  const row = db.egresos.find((e) => e.id === id)
  if (!row) throw new Error("No se encontró el egreso.")
  return row
}

export async function fetchOutflows(month?: string): Promise<Outflow[]> {
  let rows = db.egresos

  if (month) {
    const start = `${month}-01`
    const end = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1))
      .toISOString()
      .split("T")[0]
    rows = rows.filter((o) => o.fecha_emision >= start && o.fecha_emision < end)
  }

  const hydrated = [...rows]
    .sort((a, b) => b.fecha_emision.localeCompare(a.fecha_emision))
    .map(hydrateOutflow)

  return latency(hydrated)
}

export async function createPurchaseExpense(
  outflow: OutflowInsert,
  detail: PurchaseInsert
): Promise<Outflow> {
  const row = insertOutflowRow(outflow, "GASTO")
  db.gastos.push({ egreso_id: row.id, ...detail })
  return latency(hydrateOutflow(row))
}

export async function createSalaryExpense(
  outflow: OutflowInsert,
  detail: SalaryInsert
): Promise<Outflow> {
  const row = insertOutflowRow(outflow, "SUELDO")
  db.sueldos.push({ egreso_id: row.id, ...detail })
  return latency(hydrateOutflow(row))
}

export type ContributionInsert = { concepto: string; importe: number }

// Guarda el sueldo y, en el mismo paso, las contribuciones patronales como
// egresos IMPUESTO pendientes (sin fecha de pago ni método).
export async function createSalaryWithContributions(
  outflow: OutflowInsert,
  salary: SalaryInsert,
  contribuciones: ContributionInsert[]
): Promise<Outflow> {
  const created = await createSalaryExpense(outflow, salary)

  for (const c of contribuciones.filter((x) => x.importe > 0 && x.concepto.trim())) {
    const row = insertOutflowRow(
      {
        fecha_emision: outflow.fecha_emision, // mismo devengamiento que el sueldo
        importe: c.importe,
      },
      "IMPUESTO"
    )
    db.impuestos.push({ egreso_id: row.id, concepto: c.concepto })
  }

  return created
}

export async function createTaxExpense(
  outflow: OutflowInsert,
  detail: TaxInsert
): Promise<Outflow> {
  const row = insertOutflowRow(outflow, "IMPUESTO")
  db.impuestos.push({ egreso_id: row.id, ...detail })
  return latency(hydrateOutflow(row))
}

export async function createWithdrawal(
  outflow: OutflowInsert,
  detail: WithdrawalInsert
): Promise<Outflow> {
  const row = insertOutflowRow(
    {
      ...outflow,
      // los retiros son pagos inmediatos: se les fija la fecha de pago para que
      // impacten en la caja aunque el formulario no la haya cargado
      fecha_pago: outflow.fecha_pago ?? outflow.fecha_emision,
    },
    "RETIRO"
  )
  db.retiros.push({ egreso_id: row.id, ...detail })
  return latency(hydrateOutflow(row))
}

export async function markAsPaid(
  outflowId: string,
  paymentDate: string,
  paymentMethodId: string
): Promise<void> {
  const row = requireRow(outflowId)
  row.fecha_pago = paymentDate
  row.metodo_pago_id = paymentMethodId
  row.updated_at = nowIso()
  return latency(undefined)
}

export async function updatePurchaseExpense(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: PurchaseInsert
): Promise<void> {
  applyOutflowUpdate(requireRow(id), outflow)
  const d = db.gastos.find((g) => g.egreso_id === id)
  if (d) Object.assign(d, detail)
  return latency(undefined)
}

export async function updateSalaryExpense(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: SalaryInsert
): Promise<void> {
  applyOutflowUpdate(requireRow(id), outflow)
  const d = db.sueldos.find((s) => s.egreso_id === id)
  if (d) Object.assign(d, detail)
  return latency(undefined)
}

export async function updateTaxExpense(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: TaxInsert
): Promise<void> {
  applyOutflowUpdate(requireRow(id), outflow)
  const d = db.impuestos.find((t) => t.egreso_id === id)
  if (d) Object.assign(d, detail)
  return latency(undefined)
}

export async function updateWithdrawal(
  id: string,
  outflow: Partial<OutflowInsert>,
  detail: WithdrawalInsert
): Promise<void> {
  applyOutflowUpdate(requireRow(id), outflow)
  const d = db.retiros.find((w) => w.egreso_id === id)
  if (d) Object.assign(d, detail)
  return latency(undefined)
}

export async function deleteOutflow(outflowId: string, tipo: string): Promise<void> {
  const detail =
    tipo === "GASTO" ? db.gastos
    : tipo === "SUELDO" ? db.sueldos
    : tipo === "IMPUESTO" ? db.impuestos
    : tipo === "RETIRO" ? db.retiros
    : null

  if (detail) {
    const i = detail.findIndex((d) => d.egreso_id === outflowId)
    if (i >= 0) detail.splice(i, 1)
  }

  const j = db.egresos.findIndex((e) => e.id === outflowId)
  if (j >= 0) db.egresos.splice(j, 1)

  return latency(undefined)
}
