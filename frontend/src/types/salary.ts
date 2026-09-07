// Una contribución patronal del recibo (sección "COSTO TOTAL EMPLEADOR").
// La app la guarda como un egreso tipo IMPUESTO, siempre pendiente.
export type ExtractedContribution = {
  concepto: string          // ej. "ART", "Contribución Jubilación"
  importe: number | null    // null si el parser no pudo separarlo (se carga a mano)
}

// Datos que n8n devuelve tras extraer (texto del PDF) un recibo de sueldo.
// Todos opcionales: si el parser no encuentra algo, el empleado lo completa.
export type ExtractedSalary = {
  legajo?: string
  empleado?: string        // "Apellido, Nombre"
  periodo?: string         // "YYYY-MM"
  sueldo_base?: number     // total remunerativo (Hab. C/Desc)
  bono?: number            // total no remunerativo (Hab. S/Desc)
  descuentos?: number      // total deducciones
  neto?: number            // NETO del recibo (para validar / importe)
  contribuciones_total?: number            // SUB TOTAL CONTRIBUCIONES EMPLEADOR (control)
  contribuciones?: ExtractedContribution[] // contribuciones patronales → egresos IMPUESTO
  archivo?: string         // nombre del archivo original
  advertencia?: string     // si el neto no cuadra o falta algo
}
