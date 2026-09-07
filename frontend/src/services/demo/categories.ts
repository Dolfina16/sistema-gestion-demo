import type { Category } from "../../types/category"
import { db, latency } from "../../demo/db"

export async function fetchCategories(): Promise<Category[]> {
  const rows = [...db.rubros].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  return latency(rows)
}
