import type { Empleado } from "../../types/employee"
import { db, latency } from "../../demo/db"

export async function fetchEmployees(): Promise<Empleado[]> {
  const rows = [...db.empleados].sort((a, b) => a.legajo.localeCompare(b.legajo))
  return latency(rows)
}

export async function upsertEmployee(legajo: string, categoria: string): Promise<void> {
  const existing = db.empleados.find((e) => e.legajo === legajo)
  if (existing) existing.categoria = categoria || null
  else db.empleados.push({ legajo, categoria: categoria || null })
  return latency(undefined)
}
