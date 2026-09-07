import { supabase } from "../../lib/supabase"
import type { GuestBalance } from "../../types/balance"

// Returns all guests (active and inactive) — inactive guests may still have outstanding debt
export async function fetchAllBalances(): Promise<GuestBalance[]> {
  const { data, error } = await supabase
    .from("v_saldo_huesped")
    .select("*")
  if (error) throw error
  return data
}

export async function fetchGuestBalance(guestId: string): Promise<GuestBalance | null> {
  const { data, error } = await supabase
    .from("v_saldo_huesped")
    .select("*")
    .eq("huesped_id", guestId)
    .single()
  if (error) return null
  return data
}
