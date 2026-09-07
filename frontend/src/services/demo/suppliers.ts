import type { Supplier } from "../../types/supplier"
import { db, latency, newId, nowIso } from "../../demo/db"

export async function fetchSuppliers(): Promise<Supplier[]> {
  const rows = [...db.proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  return latency(rows)
}

export async function findOrCreateSupplier(nombre: string): Promise<Supplier> {
  const trimmed = nombre.trim()

  const existing = db.proveedores.find(
    (p) => p.nombre.toLowerCase() === trimmed.toLowerCase()
  )
  if (existing) return latency({ ...existing })

  const row: Supplier = {
    id: newId("pv"),
    nombre: trimmed,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  db.proveedores.push(row)
  return latency({ ...row })
}
