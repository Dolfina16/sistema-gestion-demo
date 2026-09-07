// Datos que n8n devuelve tras extraer (OCR/IA) una factura de compra.
// Todos opcionales: la IA puede no encontrar algún campo y el empleado lo completa.
export type ExtractedInvoice = {
  proveedor?: string        // razón social del proveedor
  cuit?: string             // CUIT del proveedor (si se detecta)
  fecha_emision?: string    // YYYY-MM-DD
  fecha_vencimiento?: string
  importe?: number          // total de la factura
  comprobante?: string      // N° de comprobante
  concepto?: string         // descripción / detalle
  // metadatos para la revisión
  archivo?: string          // nombre del archivo original
  confianza?: number        // 0..1, qué tan segura está la IA (opcional)
  advertencia?: string      // aviso de validación (CUIT inválido, archivo que falló, etc.)
}
