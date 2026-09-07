import type { Income, IncomeInsert } from "../../types/income"
import { db, latency, newId, nowIso } from "../../demo/db"

export async function fetchIncomesByGuest(guestId: string): Promise<Income[]> {
  const rows = db.ingresos
    .filter((i) => i.huesped_id === guestId)
    .sort((a, b) => b.periodo.localeCompare(a.periodo))
  return latency(rows.map((i) => ({ ...i })))
}

export async function createIncome(income: IncomeInsert): Promise<Income> {
  const row: Income = { ...income, id: newId("in"), created_at: nowIso(), updated_at: nowIso() }
  db.ingresos.push(row)
  return latency({ ...row })
}

export async function deleteIncome(id: string): Promise<void> {
  const i = db.ingresos.findIndex((r) => r.id === id)
  if (i >= 0) db.ingresos.splice(i, 1)
  return latency(undefined)
}
