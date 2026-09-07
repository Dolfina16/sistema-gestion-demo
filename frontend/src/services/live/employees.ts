import { supabase } from "../../lib/supabase"
import type { Empleado } from "../../types/employee"

export async function fetchEmployees(): Promise<Empleado[]> {
  const { data, error } = await supabase
    .from("empleados")
    .select("legajo, categoria")
    .order("legajo")
  if (error) throw error
  return data ?? []
}

// Crea o actualiza el empleado (legajo → categoría). Se usa al confirmar un sueldo
// importado para ir poblando la maestra automáticamente.
export async function upsertEmployee(legajo: string, categoria: string): Promise<void> {
  const { error } = await supabase
    .from("empleados")
    .upsert({ legajo, categoria: categoria || null }, { onConflict: "legajo" })
  if (error) throw error
}
