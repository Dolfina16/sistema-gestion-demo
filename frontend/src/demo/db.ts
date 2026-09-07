// ============================================================
// Base de datos en memoria de la demo
// ============================================================
// Reemplaza a Supabase cuando la app corre en modo demo. Las tablas viven en
// memoria: los cambios que hace el visitante (altas, cobros, egresos) se ven
// reflejados durante la sesión y se pierden al recargar. Es a propósito —
// cada visita arranca del mismo estado limpio.
//
// El modelo replica el de Postgres: los egresos se guardan planos y sus
// detalles en tablas aparte, igual que en la base real. `hydrateOutflow` hace
// a mano el join que allá resuelve PostgREST, así el resto de la app consume
// exactamente la misma forma de dato en los dos modos.

import type { Guest } from "../types/guest"
import type { Income } from "../types/income"
import type { Payment } from "../types/payment"
import type { Category } from "../types/category"
import type { PaymentMethod } from "../types/paymentMethod"
import type { Supplier } from "../types/supplier"
import type { Empleado } from "../types/employee"
import type {
  Outflow,
  PurchaseDetail,
  SalaryDetail,
  TaxDetail,
  WithdrawalDetail,
} from "../types/outflow"

import * as seed from "./dataset"
import type { BillingStatusRow, DemoUser, OutflowRow } from "./dataset"

type Tables = {
  huespedes: Guest[]
  ingresos: Income[]
  pagos: Payment[]
  egresos: OutflowRow[]
  gastos: PurchaseDetail[]
  sueldos: SalaryDetail[]
  impuestos: TaxDetail[]
  retiros: WithdrawalDetail[]
  metodos_pago: PaymentMethod[]
  rubros: Category[]
  proveedores: Supplier[]
  empleados: Empleado[]
  facturacion_estado: BillingStatusRow[]
  usuarios: DemoUser[]
}

// Copia profunda del seed: la demo muta sus propias tablas sin tocar el dataset
// original, así el módulo se puede volver a leer sin arrastrar cambios.
function clone<T>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r }))
}

export const db: Tables = {
  huespedes: clone(seed.GUESTS),
  ingresos: clone(seed.INCOMES),
  pagos: clone(seed.PAYMENTS),
  egresos: clone(seed.OUTFLOWS),
  gastos: clone(seed.PURCHASE_DETAILS),
  sueldos: clone(seed.SALARY_DETAILS),
  impuestos: clone(seed.TAX_DETAILS),
  retiros: clone(seed.WITHDRAWAL_DETAILS),
  metodos_pago: clone(seed.PAYMENT_METHODS),
  rubros: clone(seed.CATEGORIES),
  proveedores: clone(seed.SUPPLIERS),
  empleados: clone(seed.EMPLOYEES),
  facturacion_estado: clone(seed.BILLING_STATUSES),
  usuarios: clone(seed.USERS),
}

// ---------- utilidades ----------

let counter = 0

// Id de fila nuevo. No es un UUID real, pero cumple la misma función: ser único
// y opaco para el resto de la app.
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function today(): string {
  return new Date().toISOString().split("T")[0]
}

// Latencia simulada. Sin esto los spinners y estados de carga de la UI nunca se
// verían, y la demo se sentiría distinta de la app real.
export function latency<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// ---------- joins ----------

// Arma el objeto `Outflow` completo (fila + detalle + nombres de catálogo),
// que es lo que devuelve PostgREST en el modo live.
export function hydrateOutflow(row: OutflowRow): Outflow {
  const metodo = db.metodos_pago.find((m) => m.id === row.metodo_pago_id)

  const gasto = db.gastos.find((g) => g.egreso_id === row.id)
  const sueldo = db.sueldos.find((s) => s.egreso_id === row.id)
  const impuesto = db.impuestos.find((t) => t.egreso_id === row.id)
  const retiro = db.retiros.find((w) => w.egreso_id === row.id)

  return {
    ...row,
    metodos_pago: metodo ? { nombre: metodo.nombre } : null,
    gastos: gasto
      ? {
          ...gasto,
          rubros: db.rubros.find((r) => r.id === gasto.rubro_id) ?? null,
          proveedores: db.proveedores.find((p) => p.id === gasto.proveedor_id) ?? null,
        }
      : null,
    sueldos: sueldo ? { ...sueldo } : null,
    impuestos: impuesto ? { ...impuesto } : null,
    retiros: retiro ? { ...retiro } : null,
  }
}

// Tabla de detalle que corresponde a cada tipo de egreso.
export const DETAIL_TABLE = {
  GASTO: "gastos",
  SUELDO: "sueldos",
  IMPUESTO: "impuestos",
  RETIRO: "retiros",
} as const
