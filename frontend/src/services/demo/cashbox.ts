import { db, hydrateOutflow, latency } from "../../demo/db"
import {
  analyzeCashbox,
  computeOpeningBalances,
  type CashboxAnalysis,
  type OpeningBalances,
  type PaymentRow,
} from "../cashboxAnalysis"

// El filtrado replica el de las queries del modo live: los cobros y cargos por
// su fecha/período, y los egresos por emisión O por pago dentro del rango
// (hace falta para el corte devengado vs. percibido).
export async function fetchCashboxAnalysis(
  startDate: string,
  endDate: string,
  cashMethodId: string | null
): Promise<CashboxAnalysis> {
  const payments: PaymentRow[] = db.pagos
    .filter((p) => p.fecha >= startDate && p.fecha <= endDate)
    .map((p) => {
      const guest = db.huespedes.find((g) => g.id === p.huesped_id)
      return {
        id: p.id,
        importe: p.importe,
        fecha: p.fecha,
        metodo_pago_id: p.metodo_pago_id,
        huespedes: guest ? { nombre: guest.nombre, apellido: guest.apellido } : null,
      }
    })

  const incomes = db.ingresos
    .filter((i) => i.periodo >= startDate && i.periodo <= endDate)
    .map((i) => ({ importe: i.importe, periodo: i.periodo, concepto: i.concepto }))

  const outflows = db.egresos
    .filter((o) => {
      const byEmision = o.fecha_emision >= startDate && o.fecha_emision <= endDate
      const byPago = !!o.fecha_pago && o.fecha_pago >= startDate && o.fecha_pago <= endDate
      return byEmision || byPago
    })
    .map(hydrateOutflow)

  return latency(
    analyzeCashbox(payments, incomes, outflows, startDate, endDate, cashMethodId),
    350
  )
}

export async function fetchOpeningBalances(
  startDate: string,
  cashMethodId: string | null
): Promise<OpeningBalances> {
  const payments = db.pagos.filter((p) => p.fecha < startDate)
  const settled = db.egresos.filter((o) => !!o.fecha_pago && o.fecha_pago < startDate)

  return latency(computeOpeningBalances(payments, settled, cashMethodId))
}

export async function findCashMethodId(): Promise<string | null> {
  const metodo = db.metodos_pago.find((m) => m.nombre.toLowerCase() === "efectivo")
  return latency(metodo?.id ?? null)
}
