export type Supplier = {
  id: string
  nombre: string
  cuit?: string
  created_at: string
  updated_at: string
}

export type SupplierInsert = {
  nombre: string
  cuit?: string
}
