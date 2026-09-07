export type Guest = {
  id: string
  nombre: string
  apellido: string
  cuit?: string
  contacto?: string         // legacy — texto libre, ya no se usa en el formulario
  contacto_nombre?: string
  contacto_email?: string
  contacto_telefono?: string
  cobertura?: string
  cuota_mensual?: number
  monto_exento?: number     // parte que va a obra social (factura exenta)
  fecha_alta: string
  activo: boolean
  fecha_baja?: string
  observaciones?: string
  created_at: string
  updated_at: string
}

export type GuestInsert = {
  nombre: string
  apellido: string
  cuit?: string
  contacto?: string         // legacy
  contacto_nombre?: string
  contacto_email?: string
  contacto_telefono?: string
  cobertura?: string
  cuota_mensual?: number | null   // null = limpiar la columna al actualizar
  monto_exento?: number | null    // null = limpiar la columna al actualizar
  fecha_alta?: string
  activo?: boolean
  observaciones?: string
}

export type GuestUpdate = Partial<GuestInsert> & {
  fecha_baja?: string
}
