import { supabase } from "../../lib/supabase"
import type { Outflow } from "../../types/outflow"
import {
  analyzeCashbox,
  computeOpeningBalances,
  type CashboxAnalysis,
  type IncomeRow,
  type OpeningBalances,
  type PaymentRow,
} from "../cashboxAnalysis"

const OUTFLOW_SELECT = `
  *,
  metodos_pago(nombre),
  gastos(egreso_id, concepto, rubro_id, proveedor_id, rubros(nombre), proveedores(nombre)),
  sueldos(egreso_id, legajo, periodo, sueldo_base, presentismo, horas_extra, pasaje, bono),
  impuestos(egreso_id, concepto),
  retiros(egreso_id, socio_id, origen)
`

export async function fetchCashboxAnalysis(
  startDate: string,
  endDate: string,
  cashMethodId: string | null
): Promise<CashboxAnalysis> {
  const [paymentsRes, incomesRes, outflowsRes] = await Promise.all([
    supabase
      .from("pagos")
      .select("id, importe, fecha, metodo_pago_id, huespedes(nombre, apellido)")
      .gte("fecha", startDate)
      .lte("fecha", endDate),
    supabase
      .from("ingresos")
      .select("importe, periodo, concepto")
      .gte("periodo", startDate)
      .lte("periodo", endDate),
    supabase
      .from("egresos")
      .select(OUTFLOW_SELECT)
      .or(
        `and(fecha_emision.gte.${startDate},fecha_emision.lte.${endDate}),` +
          `and(fecha_pago.gte.${startDate},fecha_pago.lte.${endDate})`
      ),
  ])

  if (paymentsRes.error) throw paymentsRes.error
  if (incomesRes.error) throw incomesRes.error
  if (outflowsRes.error) throw outflowsRes.error

  return analyzeCashbox(
    (paymentsRes.data ?? []) as unknown as PaymentRow[],
    (incomesRes.data ?? []) as unknown as IncomeRow[],
    (outflowsRes.data ?? []) as unknown as Outflow[],
    startDate,
    endDate,
    cashMethodId
  )
}

export async function fetchOpeningBalances(
  startDate: string,
  cashMethodId: string | null
): Promise<OpeningBalances> {
  const [paymentsRes, outflowsRes] = await Promise.all([
    supabase.from("pagos").select("importe, metodo_pago_id").lt("fecha", startDate),
    supabase
      .from("egresos")
      .select("importe, metodo_pago_id")
      .not("fecha_pago", "is", null)
      .lt("fecha_pago", startDate),
  ])
  if (paymentsRes.error) throw paymentsRes.error
  if (outflowsRes.error) throw outflowsRes.error

  return computeOpeningBalances(paymentsRes.data ?? [], outflowsRes.data ?? [], cashMethodId)
}

export async function findCashMethodId(): Promise<string | null> {
  const { data } = await supabase
    .from("metodos_pago")
    .select("id")
    .ilike("nombre", "efectivo")
    .maybeSingle()
  return data?.id ?? null
}
