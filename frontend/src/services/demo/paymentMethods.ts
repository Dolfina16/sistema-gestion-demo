import type { PaymentMethod } from "../../types/paymentMethod"
import { db, latency } from "../../demo/db"

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const rows = [...db.metodos_pago].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  return latency(rows)
}
