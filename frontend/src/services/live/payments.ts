import { supabase } from "../../lib/supabase"
import type { Payment, PaymentInsert } from "../../types/payment"

export async function fetchPaymentsByGuest(guestId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("*, metodos_pago(nombre)")
    .eq("huesped_id", guestId)
    .order("fecha", { ascending: false })
  if (error) throw error
  return data
}

export async function createPayment(payment: PaymentInsert): Promise<Payment> {
  const { data, error } = await supabase
    .from("pagos")
    .insert(payment)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("pagos").delete().eq("id", id)
  if (error) throw error
}
