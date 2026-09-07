// ============================================================
// Datos ficticios de la demo
// ============================================================
// TODO lo que hay acá es inventado: personas, CUITs, proveedores, importes y
// legajos. No corresponde a ninguna residencia real.
//
// El dataset se arma en relación a la fecha de hoy (no con fechas fijas), así la
// demo siempre muestra el mes en curso y los tres anteriores sin quedar vieja.

import type { Guest } from "../types/guest"
import type { Income } from "../types/income"
import type { Payment } from "../types/payment"
import type { Category } from "../types/category"
import type { PaymentMethod } from "../types/paymentMethod"
import type { Supplier } from "../types/supplier"
import type { Empleado } from "../types/employee"
import type {
  OutflowType,
  PurchaseDetail,
  SalaryDetail,
  TaxDetail,
  WithdrawalDetail,
} from "../types/outflow"

// Fila plana de `egresos`, tal como vive en la tabla (sin los joins).
export type OutflowRow = {
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
}

export type DemoUser = {
  id: string
  email: string
  nombre: string
  rol: "socio" | "administrativo"
  password: string
}

export type BillingStatusRow = {
  huesped_id: string
  periodo: string
  estado: "pendiente" | "facturado" | "enviado"
}

// ---------- helpers de fecha ----------

const TODAY = new Date()

function iso(d: Date): string {
  return d.toISOString().split("T")[0]
}

// Primer día del mes, `back` meses hacia atrás (0 = mes actual).
function monthStart(back: number): Date {
  return new Date(TODAY.getFullYear(), TODAY.getMonth() - back, 1)
}

// Día `day` de ese mes, acotado para no desbordar a otro mes.
function dayOf(back: number, day: number): string {
  const start = monthStart(back)
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  return iso(new Date(start.getFullYear(), start.getMonth(), Math.min(day, lastDay)))
}

// "YYYY-MM-01" — la clave de período que usa la app.
function period(back: number): string {
  return iso(monthStart(back))
}

const NOW = TODAY.toISOString()

function stamps() {
  return { created_at: NOW, updated_at: NOW }
}

// ---------- catálogos ----------

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "pm-efectivo", nombre: "Efectivo", ...stamps() },
  { id: "pm-transferencia", nombre: "Transferencia", ...stamps() },
  { id: "pm-cheque", nombre: "Cheque", ...stamps() },
  { id: "pm-debito", nombre: "Débito automático", ...stamps() },
]

export const CATEGORIES: Category[] = [
  { id: "rb-alimentos", nombre: "Alimentos", ...stamps() },
  { id: "rb-farmacia", nombre: "Farmacia y descartables", ...stamps() },
  { id: "rb-limpieza", nombre: "Limpieza e higiene", ...stamps() },
  { id: "rb-servicios", nombre: "Servicios", ...stamps() },
  { id: "rb-mantenimiento", nombre: "Mantenimiento", ...stamps() },
  { id: "rb-lavanderia", nombre: "Lavandería", ...stamps() },
  { id: "rb-honorarios", nombre: "Honorarios profesionales", ...stamps() },
  { id: "rb-seguros", nombre: "Seguros", ...stamps() },
]

export const SUPPLIERS: Supplier[] = [
  { id: "pv-almacen", nombre: "Distribuidora del Valle", cuit: "30-71204558-4", ...stamps() },
  { id: "pv-carniceria", nombre: "Frigorífico San Andrés", cuit: "30-70918342-7", ...stamps() },
  { id: "pv-farmacia", nombre: "Farmacia Belgrano", cuit: "27-24118903-5", ...stamps() },
  { id: "pv-limpieza", nombre: "Insumos Aurora", cuit: "30-71455201-9", ...stamps() },
  { id: "pv-gas", nombre: "Gas del Sur", cuit: "30-65432198-2", ...stamps() },
  { id: "pv-electricidad", nombre: "Cooperativa Eléctrica", cuit: "30-54187630-1", ...stamps() },
  { id: "pv-lavanderia", nombre: "Lavadero Industrial Nieve", cuit: "30-71099887-6", ...stamps() },
  { id: "pv-mantenimiento", nombre: "Servicios Técnicos Rivas", cuit: "20-28776411-3", ...stamps() },
  { id: "pv-seguros", nombre: "Aseguradora Norte", cuit: "30-50012345-8", ...stamps() },
]

export const EMPLOYEES: Empleado[] = [
  { legajo: "001", categoria: "ENFERMERA DE PISO" },
  { legajo: "002", categoria: "ASISTENTE GERIATRICO/A" },
  { legajo: "003", categoria: "ASISTENTE GERIATRICO/A" },
  { legajo: "004", categoria: "COCINERA" },
  { legajo: "005", categoria: "AYUDANTE DE COCINA" },
  { legajo: "006", categoria: "MUCAMA DE PISO" },
  { legajo: "007", categoria: "ADMINISTRATIVO/A" },
  { legajo: "008", categoria: "AUXILIAR DE ENFERMERIA" },
  { legajo: "009", categoria: "MANTENIMIENTO GRAL" },
  { legajo: "010", categoria: "NUTRICIONISTA" },
]

// Usuarios de la demo. Las credenciales se muestran en la pantalla de login:
// es una demo pública, no hay nada que proteger.
export const USERS: DemoUser[] = [
  {
    id: "us-socio",
    email: "socio@demo.app",
    nombre: "Perfil Socio",
    rol: "socio",
    password: "demo1234",
  },
  {
    id: "us-admin",
    email: "admin@demo.app",
    nombre: "Perfil Administrativo",
    rol: "administrativo",
    password: "demo1234",
  },
]

// ---------- huéspedes ----------

type GuestSeed = {
  id: string
  nombre: string
  apellido: string
  cuit: string
  cobertura: string
  cuota: number
  exento: number
  contacto: string
  email: string
  telefono: string
  activo?: boolean
  altaMesesAtras: number
}

const GUEST_SEEDS: GuestSeed[] = [
  { id: "hu-01", nombre: "Beatriz", apellido: "Alonso", cuit: "27-05412887-4", cobertura: "PAMI", cuota: 3_480_000, exento: 1_950_000, contacto: "Laura Alonso", email: "laura.alonso@ejemplo.com", telefono: "11 4455-2210", altaMesesAtras: 26 },
  { id: "hu-02", nombre: "Héctor", apellido: "Bianchi", cuit: "20-04988301-9", cobertura: "Particular", cuota: 5_900_000, exento: 0, contacto: "Diego Bianchi", email: "diego.bianchi@ejemplo.com", telefono: "11 6721-8834", altaMesesAtras: 19 },
  { id: "hu-03", nombre: "Norma", apellido: "Cabrera", cuit: "27-06133427-1", cobertura: "PAMI", cuota: 3_480_000, exento: 1_950_000, contacto: "Silvia Cabrera", email: "silvia.cabrera@ejemplo.com", telefono: "11 3390-4471", altaMesesAtras: 33 },
  { id: "hu-04", nombre: "Ramón", apellido: "Duarte", cuit: "20-05221094-6", cobertura: "ISSN", cuota: 4_620_000, exento: 2_400_000, contacto: "Marcela Duarte", email: "marcela.duarte@ejemplo.com", telefono: "299 415-7788", altaMesesAtras: 11 },
  { id: "hu-05", nombre: "Alicia", apellido: "Esposito", cuit: "27-05877612-3", cobertura: "OSDE", cuota: 6_300_000, exento: 3_100_000, contacto: "Pablo Esposito", email: "pablo.esposito@ejemplo.com", telefono: "11 5580-1192", altaMesesAtras: 8 },
  { id: "hu-06", nombre: "Osvaldo", apellido: "Ferrari", cuit: "20-04710558-2", cobertura: "PAMI", cuota: 3_480_000, exento: 1_950_000, contacto: "Ana Ferrari", email: "ana.ferrari@ejemplo.com", telefono: "11 2244-6690", altaMesesAtras: 41 },
  { id: "hu-07", nombre: "Marta", apellido: "Gómez", cuit: "27-06044219-8", cobertura: "ISSN", cuota: 4_620_000, exento: 2_400_000, contacto: "Nicolás Gómez", email: "nicolas.gomez@ejemplo.com", telefono: "299 588-3324", altaMesesAtras: 15 },
  { id: "hu-08", nombre: "Julio", apellido: "Herrera", cuit: "20-05009874-5", cobertura: "Particular", cuota: 5_900_000, exento: 0, contacto: "Verónica Herrera", email: "veronica.herrera@ejemplo.com", telefono: "11 7712-0043", altaMesesAtras: 6 },
  { id: "hu-09", nombre: "Susana", apellido: "Ibáñez", cuit: "27-05633190-7", cobertura: "OSDE", cuota: 6_300_000, exento: 3_100_000, contacto: "Gustavo Ibáñez", email: "gustavo.ibanez@ejemplo.com", telefono: "11 4098-5561", altaMesesAtras: 22 },
  { id: "hu-10", nombre: "Roberto", apellido: "Juárez", cuit: "20-04855207-0", cobertura: "PAMI", cuota: 3_480_000, exento: 1_950_000, contacto: "Claudia Juárez", email: "claudia.juarez@ejemplo.com", telefono: "11 6634-9917", altaMesesAtras: 29 },
  { id: "hu-11", nombre: "Elsa", apellido: "Lombardi", cuit: "27-05990441-2", cobertura: "ISSN", cuota: 4_620_000, exento: 2_400_000, contacto: "Federico Lombardi", email: "federico.lombardi@ejemplo.com", telefono: "299 470-2258", altaMesesAtras: 13 },
  { id: "hu-12", nombre: "Carlos", apellido: "Molina", cuit: "20-05170663-8", cobertura: "Particular", cuota: 5_900_000, exento: 0, contacto: "Rosa Molina", email: "rosa.molina@ejemplo.com", telefono: "11 3327-7704", altaMesesAtras: 4 },
  { id: "hu-13", nombre: "Irma", apellido: "Navarro", cuit: "27-06210338-9", cobertura: "PAMI", cuota: 3_480_000, exento: 1_950_000, contacto: "Sergio Navarro", email: "sergio.navarro@ejemplo.com", telefono: "11 5512-8836", altaMesesAtras: 17 },
  { id: "hu-14", nombre: "Delia", apellido: "Ortiz", cuit: "27-05745026-1", cobertura: "OSDE", cuota: 6_300_000, exento: 3_100_000, contacto: "Mariano Ortiz", email: "mariano.ortiz@ejemplo.com", telefono: "11 2871-4409", altaMesesAtras: 9 },
  // Bajas: siguen figurando porque la deuda no se borra con la baja lógica.
  { id: "hu-15", nombre: "Aníbal", apellido: "Paz", cuit: "20-04390112-4", cobertura: "PAMI", cuota: 3_480_000, exento: 1_950_000, contacto: "Teresa Paz", email: "teresa.paz@ejemplo.com", telefono: "11 4416-6628", activo: false, altaMesesAtras: 35 },
  { id: "hu-16", nombre: "Nélida", apellido: "Quiroga", cuit: "27-05288740-6", cobertura: "Particular", cuota: 5_900_000, exento: 0, contacto: "Andrés Quiroga", email: "andres.quiroga@ejemplo.com", telefono: "11 6690-3315", activo: false, altaMesesAtras: 24 },
]

export const GUESTS: Guest[] = GUEST_SEEDS.map((g) => ({
  id: g.id,
  nombre: g.nombre,
  apellido: g.apellido,
  cuit: g.cuit,
  contacto_nombre: g.contacto,
  contacto_email: g.email,
  contacto_telefono: g.telefono,
  cobertura: g.cobertura,
  cuota_mensual: g.cuota,
  monto_exento: g.exento,
  fecha_alta: dayOf(g.altaMesesAtras, 5),
  activo: g.activo ?? true,
  fecha_baja: g.activo === false ? dayOf(2, 20) : undefined,
  ...stamps(),
}))

// ---------- cuenta corriente ----------
//
// Cuatro meses de cuotas. Los cobros se arman para que quede un abanico de
// situaciones visible en la pantalla de deudores:
//   • la mayoría al día (cobrado todo)
//   • dos con el mes en curso impago
//   • uno con dos meses de atraso
//   • uno con un pago parcial
//   • una baja que quedó debiendo

const MONTHS_BACK = [3, 2, 1, 0]

// huésped → meses (hacia atrás) que quedaron SIN cobrar
const UNPAID: Record<string, number[]> = {
  "hu-03": [0],
  "hu-08": [0],
  "hu-11": [1, 0],
  "hu-15": [2], // baja con deuda arrastrada
}

// huésped → { mes: proporción cobrada } para los pagos parciales
const PARTIAL: Record<string, Record<number, number>> = {
  "hu-06": { 0: 0.5 },
}

export const INCOMES: Income[] = []
export const PAYMENTS: Payment[] = []

for (const guest of GUESTS) {
  const cuota = guest.cuota_mensual ?? 0
  for (const back of MONTHS_BACK) {
    // Una baja deja de devengar cuota desde el mes siguiente a la baja.
    if (!guest.activo && back < 2) continue

    INCOMES.push({
      id: `in-${guest.id}-${back}`,
      huesped_id: guest.id,
      periodo: period(back),
      importe: cuota,
      concepto: "Cuota mensual",
      ...stamps(),
    })

    if (UNPAID[guest.id]?.includes(back)) continue

    const ratio = PARTIAL[guest.id]?.[back] ?? 1
    // Los particulares suelen pagar en efectivo; el resto por transferencia.
    const metodo =
      guest.cobertura === "Particular" ? "pm-efectivo" : "pm-transferencia"

    PAYMENTS.push({
      id: `pg-${guest.id}-${back}`,
      huesped_id: guest.id,
      fecha: dayOf(back, 8),
      importe: Math.round(cuota * ratio),
      metodo_pago_id: metodo,
      ...stamps(),
    })
  }
}

// ---------- egresos ----------

const outflows: OutflowRow[] = []
const purchases: PurchaseDetail[] = []
const salaries: SalaryDetail[] = []
const taxes: TaxDetail[] = []
const withdrawals: WithdrawalDetail[] = []

let seq = 0
function outflowId(): string {
  seq += 1
  return `eg-${String(seq).padStart(4, "0")}`
}

// Gastos recurrentes: el mismo set de comprobantes cada mes, con una pequeña
// variación de importe para que los totales no se vean calcados.
type PurchaseSeed = {
  proveedor: string
  rubro: string
  concepto: string
  base: number
  dia: number
  metodo: string
}

const PURCHASE_SEEDS: PurchaseSeed[] = [
  { proveedor: "pv-almacen", rubro: "rb-alimentos", concepto: "Mercadería general", base: 4_200_000, dia: 4, metodo: "pm-transferencia" },
  { proveedor: "pv-carniceria", rubro: "rb-alimentos", concepto: "Carnes y pollo", base: 2_650_000, dia: 6, metodo: "pm-transferencia" },
  { proveedor: "pv-farmacia", rubro: "rb-farmacia", concepto: "Medicamentos y descartables", base: 1_880_000, dia: 9, metodo: "pm-efectivo" },
  { proveedor: "pv-limpieza", rubro: "rb-limpieza", concepto: "Artículos de limpieza", base: 940_000, dia: 11, metodo: "pm-efectivo" },
  { proveedor: "pv-gas", rubro: "rb-servicios", concepto: "Consumo de gas", base: 720_000, dia: 14, metodo: "pm-debito" },
  { proveedor: "pv-electricidad", rubro: "rb-servicios", concepto: "Consumo eléctrico", base: 1_120_000, dia: 14, metodo: "pm-debito" },
  { proveedor: "pv-lavanderia", rubro: "rb-lavanderia", concepto: "Servicio de lavandería", base: 830_000, dia: 17, metodo: "pm-transferencia" },
  { proveedor: "pv-mantenimiento", rubro: "rb-mantenimiento", concepto: "Mantenimiento general", base: 460_000, dia: 21, metodo: "pm-efectivo" },
  { proveedor: "pv-seguros", rubro: "rb-seguros", concepto: "Póliza de responsabilidad civil", base: 390_000, dia: 3, metodo: "pm-debito" },
]

// Variación determinística por mes (±6%), para no depender de Math.random y que
// los importes sean estables entre recargas.
function variation(base: number, back: number, index: number): number {
  const factor = 1 + (((index * 7 + back * 13) % 13) - 6) / 100
  return Math.round((base * factor) / 1000) * 1000
}

for (const back of MONTHS_BACK) {
  // --- gastos ---
  PURCHASE_SEEDS.forEach((seed, i) => {
    const id = outflowId()
    const emision = dayOf(back, seed.dia)
    // En el mes en curso quedan dos comprobantes pendientes de pago.
    const pendiente = back === 0 && (i === 1 || i === 6)

    outflows.push({
      id,
      tipo: "GASTO",
      fecha_emision: emision,
      fecha_vencimiento: dayOf(back, seed.dia + 10),
      fecha_pago: pendiente ? undefined : emision,
      importe: variation(seed.base, back, i),
      metodo_pago_id: pendiente ? undefined : seed.metodo,
      comprobante: `A-0003-${String(1200 + back * 40 + i).padStart(8, "0")}`,
      ...stamps(),
    })
    purchases.push({
      egreso_id: id,
      concepto: seed.concepto,
      rubro_id: seed.rubro,
      proveedor_id: seed.proveedor,
    })
  })

  // --- sueldos ---
  EMPLOYEES.forEach((emp, i) => {
    const id = outflowId()
    const base = 1_450_000 + i * 85_000
    const presentismo = Math.round(base * 0.08)
    const horasExtra = i % 3 === 0 ? 120_000 : 0
    const bono = i % 4 === 0 ? 200_000 : 0
    const pago = dayOf(back, 5)

    outflows.push({
      id,
      tipo: "SUELDO",
      fecha_emision: dayOf(back, 1),
      fecha_pago: pago,
      importe: base + presentismo + horasExtra + bono,
      metodo_pago_id: "pm-transferencia",
      ...stamps(),
    })
    salaries.push({
      egreso_id: id,
      legajo: emp.legajo,
      periodo: period(back),
      sueldo_base: base,
      presentismo,
      horas_extra: horasExtra,
      bono,
    })
  })

  // --- impuestos y contribuciones ---
  const TAX_SEEDS = [
    { concepto: "Contribuciones patronales (F.931)", base: 4_100_000, dia: 12 },
    { concepto: "ART", base: 780_000, dia: 12 },
    { concepto: "Ingresos Brutos", base: 1_340_000, dia: 18 },
    { concepto: "Tasa municipal de habilitación", base: 210_000, dia: 20 },
  ]
  TAX_SEEDS.forEach((seed, i) => {
    const id = outflowId()
    const emision = dayOf(back, seed.dia)
    // Las cargas del mes en curso todavía no vencieron.
    const pendiente = back === 0

    outflows.push({
      id,
      tipo: "IMPUESTO",
      fecha_emision: emision,
      fecha_vencimiento: dayOf(back, seed.dia + 8),
      fecha_pago: pendiente ? undefined : emision,
      importe: variation(seed.base, back, i + 20),
      metodo_pago_id: pendiente ? undefined : "pm-transferencia",
      ...stamps(),
    })
    taxes.push({ egreso_id: id, concepto: seed.concepto })
  })

  // --- retiros de socios (salvo el mes en curso, que todavía no se hizo) ---
  if (back > 0) {
    ;[1, 2].forEach((socio, i) => {
      const id = outflowId()
      const fecha = dayOf(back, 25)
      outflows.push({
        id,
        tipo: "RETIRO",
        fecha_emision: fecha,
        fecha_pago: fecha,
        importe: variation(3_500_000, back, i + 40),
        metodo_pago_id: i === 0 ? "pm-transferencia" : "pm-efectivo",
        ...stamps(),
      })
      withdrawals.push({
        egreso_id: id,
        socio_id: socio,
        origen: i === 0 ? "Banco" : "Caja",
      })
    })
  }
}

export const OUTFLOWS = outflows
export const PURCHASE_DETAILS = purchases
export const SALARY_DETAILS = salaries
export const TAX_DETAILS = taxes
export const WITHDRAWAL_DETAILS = withdrawals

// ---------- estado de facturación ----------
// Los meses cerrados quedan facturados; el mes en curso arranca pendiente para
// que se pueda probar la corrida de facturación en la demo.

export const BILLING_STATUSES: BillingStatusRow[] = GUESTS.filter((g) => g.activo).flatMap(
  (g) =>
    [3, 2, 1].map((back) => ({
      huesped_id: g.id,
      periodo: period(back),
      estado: "facturado" as const,
    }))
)
