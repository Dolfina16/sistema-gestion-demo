import { supabase } from "../../lib/supabase"
import type { Category } from "../../types/category"

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("rubros")
    .select("*")
    .order("nombre")
  if (error) throw error
  return data
}
