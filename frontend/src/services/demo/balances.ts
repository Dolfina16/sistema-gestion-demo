import type { GuestBalance } from "../../types/balance"
import { db, latency } from "../../demo/db"

// Equivalente a la vista `v_saldo_huesped` de Postgres: saldo = Σ ingresos − Σ pagos.
// Se calcula en cada lectura, igual que la vista — nunca es una columna guardada.
function balanceOf(guestId: string): { total_ingresos: number; total_pagos: number } {
  const total_ingresos = db.ingresos
    .filter((i) => i.huesped_id === guestId)
    .reduce((acc, i) => acc + Number(i.importe), 0)

  const total_pagos = db.pagos
    .filter((p) => p.huesped_id === guestId)
    .reduce((acc, p) => acc + Number(p.importe), 0)

  return { total_ingresos, total_pagos }
}

function rowFor(guestId: string): GuestBalance | null {
  const guest = db.huespedes.find((g) => g.id === guestId)
  if (!guest) return null

  const { total_ingresos, total_pagos } = balanceOf(guestId)
  return {
    huesped_id: guest.id,
    nombre: guest.nombre,
    apellido: guest.apellido,
    activo: guest.activo,
    total_ingresos,
    total_pagos,
    saldo: total_ingresos - total_pagos,
  }
}

// Devuelve activos e inactivos: una baja puede seguir teniendo deuda.
export async function fetchAllBalances(): Promise<GuestBalance[]> {
  const rows = db.huespedes
    .map((g) => rowFor(g.id))
    .filter((r): r is GuestBalance => r !== null)
  return latency(rows)
}

export async function fetchGuestBalance(guestId: string): Promise<GuestBalance | null> {
  return latency(rowFor(guestId))
}
