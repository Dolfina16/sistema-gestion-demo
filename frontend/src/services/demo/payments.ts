import type { Payment, PaymentInsert } from "../../types/payment"
import { db, latency, newId, nowIso } from "../../demo/db"

// El modo live trae el método de pago con un join (`*, metodos_pago(nombre)`) y
// la UI lo usa para describir cada cobro. Acá se resuelve a mano.
function withMethod(p: Payment): Payment & { metodos_pago?: { nombre: string } } {
  const metodo = db.metodos_pago.find((m) => m.id === p.metodo_pago_id)
  return { ...p, metodos_pago: metodo ? { nombre: metodo.nombre } : undefined }
}

export async function fetchPaymentsByGuest(guestId: string): Promise<Payment[]> {
  const rows = db.pagos
    .filter((p) => p.huesped_id === guestId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(withMethod)
  return latency(rows)
}

export async function createPayment(payment: PaymentInsert): Promise<Payment> {
  const row: Payment = { ...payment, id: newId("pg"), created_at: nowIso(), updated_at: nowIso() }
  db.pagos.push(row)
  return latency({ ...row })
}

export async function deletePayment(id: string): Promise<void> {
  const i = db.pagos.findIndex((r) => r.id === id)
  if (i >= 0) db.pagos.splice(i, 1)
  return latency(undefined)
}
