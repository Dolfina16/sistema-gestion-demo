import { supabase } from "../../lib/supabase"
import type { Supplier, SupplierInsert } from "../../types/supplier"

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre")
  if (error) throw error
  return data
}

export async function findOrCreateSupplier(nombre: string): Promise<Supplier> {
  const trimmed = nombre.trim()

  const { data: existing } = await supabase
    .from("proveedores")
    .select("*")
    .ilike("nombre", trimmed)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from("proveedores")
    .insert({ nombre: trimmed } satisfies SupplierInsert)
    .select()
    .single()
  if (error) throw error
  return data
}
