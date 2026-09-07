import { supabase } from "../../lib/supabase"
import type { Income, IncomeInsert } from "../../types/income"

export async function fetchIncomesByGuest(guestId: string): Promise<Income[]> {
  const { data, error } = await supabase
    .from("ingresos")
    .select("*")
    .eq("huesped_id", guestId)
    .order("periodo", { ascending: false })
  if (error) throw error
  return data
}

export async function createIncome(income: IncomeInsert): Promise<Income> {
  const { data, error } = await supabase
    .from("ingresos")
    .insert(income)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from("ingresos").delete().eq("id", id)
  if (error) throw error
}
