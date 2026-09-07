export type Income = {
  id: string
  huesped_id: string
  periodo: string
  importe: number
  concepto: string
  observaciones?: string
  created_at: string
  updated_at: string
}

export type IncomeInsert = Omit<Income, "id" | "created_at" | "updated_at">
