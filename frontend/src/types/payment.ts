export type Payment = {
  id: string
  huesped_id: string
  fecha: string
  importe: number
  metodo_pago_id: string
  observaciones?: string
  created_at: string
  updated_at: string
}

export type PaymentInsert = Omit<Payment, "id" | "created_at" | "updated_at">
