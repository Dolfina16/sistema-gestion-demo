// ============================================================
// Análisis de caja — lógica pura
// ============================================================
// Este módulo no sabe de dónde salen los datos: recibe cobros, cargos y egresos
// ya cargados y arma el análisis. Lo comparten las dos implementaciones de
// `services/cashbox` (Supabase y demo), así el cálculo —que es la parte con
// reglas de negocio— vive en un solo lugar y no se duplica.

import type { Outflow } from "../types/outflow"
import { partnerLabel } from "../constants/partners"

export type AmountPair = { devengado: number; percibido: number }

export type DetailNode = {
  id: string
  label: string
  amount: AmountPair
  children?: DetailNode[]
}

// Movimiento individual de caja (efectivo o banco), base percibido.
export type CashMovement = {
  id: string
  fecha: string
  descripcion: string
  tipo: "ingreso" | "egreso"
  importe: number // siempre positivo
}

export type CashboxAnalysis = {
  // flujo de caja (percibido) para las tarjetas efectivo/banco — incluye retiros
  cashIncome: number
  cashExpenses: number
  bankIncome: number
  bankExpenses: number
  // rentabilidad (sin retiros)
  ingresos: AmountPair // devengado = Σ ingresos.importe ; percibido = Σ pagos.importe
  egresos: AmountPair // GASTO+SUELDO+IMPUESTO, sin RETIRO
  resultado: AmountPair // ingresos − egresos
  retiros: number // informativo, base caja (Σ retiros pagados)
  // árbol para detalle expandible
  ingresosTree: DetailNode[]
  egresosTree: DetailNode[]
  // detalle movimiento por movimiento de cada caja (percibido)
  cashMovements: CashMovement[]
  bankMovements: CashMovement[]
}

export type OpeningBalances = { cash: number; bank: number }

// Formas mínimas que necesita el cálculo (subconjunto de lo que traen las tablas).
export type PaymentRow = {
  id: string
  importe: number
  fecha: string
  metodo_pago_id: string
  huespedes?: { nombre: string; apellido: string } | null
}

export type IncomeRow = {
  importe: number
  periodo: string
  concepto: string
}

export type SettledRow = {
  importe: number
  metodo_pago_id?: string | null
}

function outflowLabel(o: Outflow): string {
  if (o.gastos) return o.gastos.concepto || o.gastos.proveedores?.nombre || "Gasto"
  if (o.sueldos) return `Sueldo — ${o.sueldos.legajo ?? "—"}`
  if (o.impuestos) return o.impuestos.concepto || "Impuesto"
  if (o.retiros) return `Retiro — ${partnerLabel(o.retiros.socio_id)}`
  return o.comprobante || "Egreso"
}

function inRange(date: string | null | undefined, start: string, end: string): boolean {
  return !!date && date >= start && date <= end
}

function zero(): AmountPair {
  return { devengado: 0, percibido: 0 }
}

export function analyzeCashbox(
  payments: PaymentRow[],
  incomes: IncomeRow[],
  outflows: Outflow[],
  startDate: string,
  endDate: string,
  cashMethodId: string | null
): CashboxAnalysis {
  // movimientos individuales por caja (percibido)
  const cashMovements: CashMovement[] = []
  const bankMovements: CashMovement[] = []

  // ---- Ingresos ----
  // Devengado: Σ ingresos por periodo. Percibido: Σ pagos por fecha + split efectivo/banco.
  let ingresosDevengado = 0
  const ingresosByConcepto = new Map<string, number>()
  for (const i of incomes) {
    const amount = Number(i.importe)
    ingresosDevengado += amount
    const key = i.concepto || "Sin concepto"
    ingresosByConcepto.set(key, (ingresosByConcepto.get(key) ?? 0) + amount)
  }

  let ingresosPercibido = 0
  let cashIncome = 0
  let bankIncome = 0
  for (const p of payments) {
    const amount = Number(p.importe)
    ingresosPercibido += amount
    const isCash = !!cashMethodId && p.metodo_pago_id === cashMethodId
    if (isCash) cashIncome += amount
    else bankIncome += amount
    const desc = p.huespedes ? `Cobro — ${p.huespedes.apellido}, ${p.huespedes.nombre}` : "Cobro"
    ;(isCash ? cashMovements : bankMovements).push({
      id: `pago-${p.id}`,
      fecha: p.fecha,
      descripcion: desc,
      tipo: "ingreso",
      importe: amount,
    })
  }

  const ingresosTree: DetailNode[] = [...ingresosByConcepto.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([concepto, monto]) => ({
      id: `ing-${concepto}`,
      label: concepto,
      // percibido no se imputa a concepto (pagos sin imputar) → solo a nivel total
      amount: { devengado: monto, percibido: 0 },
    }))

  // ---- Egresos ----
  const egresos: AmountPair = zero()
  let retiros = 0
  let cashExpenses = 0
  let bankExpenses = 0

  // acumuladores por tipo
  const gastosTotal = zero()
  const sueldosTotal = zero()
  const impuestosTotal = zero()
  // gastos por rubro → comprobantes
  const gastosByRubro = new Map<string, { total: AmountPair; items: DetailNode[] }>()
  const sueldosItems: DetailNode[] = []
  const impuestosItems: DetailNode[] = []

  for (const o of outflows) {
    const amount = Number(o.importe)
    const dev = inRange(o.fecha_emision, startDate, endDate)
    const per = inRange(o.fecha_pago, startDate, endDate)

    // flujo de caja (percibido) incluye TODO lo pagado en el rango, incluso retiros
    if (per) {
      const isCash = !!cashMethodId && o.metodo_pago_id === cashMethodId
      if (isCash) cashExpenses += amount
      else bankExpenses += amount
      ;(isCash ? cashMovements : bankMovements).push({
        id: `egr-${o.id}`,
        fecha: o.fecha_pago!,
        descripcion: outflowLabel(o),
        tipo: "egreso",
        importe: amount,
      })
    }

    if (o.tipo === "RETIRO") {
      if (per) retiros += amount
      continue // los retiros no entran al resultado
    }

    // egresos del resultado (GASTO/SUELDO/IMPUESTO)
    const pair: AmountPair = { devengado: dev ? amount : 0, percibido: per ? amount : 0 }
    egresos.devengado += pair.devengado
    egresos.percibido += pair.percibido

    if (o.tipo === "GASTO") {
      gastosTotal.devengado += pair.devengado
      gastosTotal.percibido += pair.percibido
      const rubro = o.gastos?.rubros?.nombre ?? "Sin rubro"
      if (!gastosByRubro.has(rubro)) gastosByRubro.set(rubro, { total: zero(), items: [] })
      const bucket = gastosByRubro.get(rubro)!
      bucket.total.devengado += pair.devengado
      bucket.total.percibido += pair.percibido
      bucket.items.push({
        id: `gasto-${o.id}`,
        label: o.gastos?.concepto || o.comprobante || "Comprobante",
        amount: pair,
      })
    } else if (o.tipo === "SUELDO") {
      sueldosTotal.devengado += pair.devengado
      sueldosTotal.percibido += pair.percibido
      sueldosItems.push({
        id: `sueldo-${o.id}`,
        label: `Legajo ${o.sueldos?.legajo ?? "—"}`,
        amount: pair,
      })
    } else if (o.tipo === "IMPUESTO") {
      impuestosTotal.devengado += pair.devengado
      impuestosTotal.percibido += pair.percibido
      impuestosItems.push({
        id: `impuesto-${o.id}`,
        label: o.impuestos?.concepto || "Impuesto",
        amount: pair,
      })
    }
  }

  const egresosTree: DetailNode[] = []
  if (gastosByRubro.size > 0) {
    egresosTree.push({
      id: "eg-gastos",
      label: "Gastos",
      amount: gastosTotal,
      children: [...gastosByRubro.entries()]
        .sort((a, b) => b[1].total.devengado - a[1].total.devengado)
        .map(([rubro, { total, items }]) => ({
          id: `rubro-${rubro}`,
          label: rubro,
          amount: total,
          children: items,
        })),
    })
  }
  if (sueldosItems.length > 0) {
    egresosTree.push({ id: "eg-sueldos", label: "Sueldos", amount: sueldosTotal, children: sueldosItems })
  }
  if (impuestosItems.length > 0) {
    egresosTree.push({ id: "eg-impuestos", label: "Impuestos", amount: impuestosTotal, children: impuestosItems })
  }

  const ingresos: AmountPair = { devengado: ingresosDevengado, percibido: ingresosPercibido }
  const resultado: AmountPair = {
    devengado: ingresos.devengado - egresos.devengado,
    percibido: ingresos.percibido - egresos.percibido,
  }

  // más reciente primero
  const byDateDesc = (a: CashMovement, b: CashMovement) => b.fecha.localeCompare(a.fecha)
  cashMovements.sort(byDateDesc)
  bankMovements.sort(byDateDesc)

  return {
    cashIncome,
    cashExpenses,
    bankIncome,
    bankExpenses,
    ingresos,
    egresos,
    resultado,
    retiros,
    ingresosTree,
    egresosTree,
    cashMovements,
    bankMovements,
  }
}

// Saldo de cada caja ANTES del período: Σ cobros − Σ egresos pagados, con fecha
// anterior a startDate, split efectivo/banco. Ambas listas ya vienen filtradas
// por fecha desde la capa de datos.
export function computeOpeningBalances(
  payments: SettledRow[],
  settledOutflows: SettledRow[],
  cashMethodId: string | null
): OpeningBalances {
  let cash = 0
  let bank = 0
  const isCash = (methodId: string | null | undefined) => !!cashMethodId && methodId === cashMethodId

  for (const p of payments) {
    const amt = Number(p.importe)
    if (isCash(p.metodo_pago_id)) cash += amt
    else bank += amt
  }
  for (const o of settledOutflows) {
    const amt = Number(o.importe)
    if (isCash(o.metodo_pago_id)) cash -= amt
    else bank -= amt
  }
  return { cash, bank }
}
