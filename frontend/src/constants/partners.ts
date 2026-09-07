// Socios de Residencia. Fuente única del mapeo socio_id → nombre.
export const PARTNER_NAMES: Record<1 | 2, string> = {
  1: "Socio 1",
  2: "Socio 2",
}

// Nombre para mostrar a partir del socio_id (con fallback defensivo).
export function partnerLabel(id: number | null | undefined): string {
  return id === 1 || id === 2 ? PARTNER_NAMES[id] : `Socio ${id ?? "?"}`
}
