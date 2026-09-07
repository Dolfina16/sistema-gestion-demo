export type OutflowType = 'GASTO' | 'SUELDO' | 'IMPUESTO' | 'RETIRO'

export type Outflow = {
  id: string
  tipo: OutflowType
  fecha_emision: string
  fecha_vencimiento?: string
  fecha_pago?: string
  importe: number
  metodo_pago_id?: string
  comprobante?: string
  observaciones?: string
  created_at: string
  updated_at: string
  // joined relations
  metodos_pago?: { nombre: string } | null
  gastos?: PurchaseDetail | null
  sueldos?: SalaryDetail | null
  impuestos?: TaxDetail | null
  retiros?: WithdrawalDetail | null
}

export type PurchaseDetail = {
  egreso_id: string
  concepto: string
  rubro_id: string
  proveedor_id: string
  rubros?: { nombre: string } | null
  proveedores?: { nombre: string } | null
}

export type SalaryDetail = {
  egreso_id: string
  legajo: string
  periodo: string
  sueldo_base: number
  presentismo: number
  horas_extra: number
  pasaje?: number
  bono: number
}

export type TaxDetail = {
  egreso_id: string
  concepto: string
}

export type WithdrawalDetail = {
  egreso_id: string
  socio_id: number
  origen: string
}

// Insert helpers (partial — importe goes in the parent Outflow)

export type OutflowInsert = {
  tipo?: OutflowType // lo inyecta cada servicio create* (createPurchaseExpense, etc.)
  fecha_emision: string
  fecha_vencimiento?: string
  fecha_pago?: string | null      // null al actualizar = limpiar el pago ("despagar")
  importe: number
  metodo_pago_id?: string | null  // null al actualizar = limpiar el método
  comprobante?: string
  observaciones?: string
}

export type PurchaseInsert = {
  proveedor_id: string
  rubro_id: string
  concepto: string
}

export type SalaryInsert = {
  legajo: string
  periodo: string
  sueldo_base: number
  presentismo: number
  horas_extra: number
  pasaje?: number
  bono: number
}

export type TaxInsert = {
  concepto: string
}

export type WithdrawalInsert = {
  socio_id: 1 | 2
  origen: string
}
