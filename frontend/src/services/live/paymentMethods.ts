import { supabase } from "../../lib/supabase"
import type { PaymentMethod } from "../../types/paymentMethod"

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from("metodos_pago")
    .select("*")
    .order("nombre")
  if (error) throw error
  return data
}
