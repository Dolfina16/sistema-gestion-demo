// ============================================================
// Simulación de los workflows de n8n
// ============================================================
// En producción estos servicios disparan webhooks a n8n, que emite las facturas
// contra AFIP (WSFEv1), manda mails y hace OCR de comprobantes. En la demo no hay
// nada de eso: se responde con la misma forma de dato que devuelven los workflows,
// con una demora que simula el ida y vuelta.
//
// Se respeta el contrato fail-closed: la app solo marca a un huésped como
// facturado si la respuesta trae `ok: true`.

import type { ExtractedInvoice } from "../../types/invoice"
import type { ExtractedSalary } from "../../types/salary"
import type {
  BillingMailBatch,
  GuestBillingPayload,
  PriceIncreaseMailBatch,
} from "../live/n8n"
import { latency } from "../../demo/db"

// Número de CAE ficticio de 14 dígitos, derivado del id del huésped para que sea
// estable dentro de la sesión.
function fakeCae(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return `7${String(hash).padStart(13, "0").slice(0, 13)}`
}

export async function triggerBillingMailBatch(
  p: BillingMailBatch
): Promise<Record<string, unknown>> {
  return latency({ ok: true, enviados: p.guests.length }, 600)
}

export async function triggerGuestBilling(
  p: GuestBillingPayload
): Promise<Record<string, unknown>> {
  return latency(
    {
      ok: true,
      cae: fakeCae(p.guest.id),
      mailEnviado: true,
      comprobantes: p.facturas.length,
    },
    500
  )
}

export async function triggerPriceIncreaseMail(
  p: PriceIncreaseMailBatch
): Promise<Record<string, unknown>> {
  return latency({ ok: true, enviados: p.guests.length }, 600)
}

// ---------- importación de comprobantes ----------
//
// En vez de leer el archivo, se devuelve un comprobante plausible por cada uno
// subido, tomando el nombre del archivo como referencia. Alcanza para mostrar el
// circuito completo: subir → revisar lo extraído → confirmar.

const DEMO_SUPPLIERS = [
  { proveedor: "Distribuidora del Valle", cuit: "30-71204558-4", concepto: "Mercadería general" },
  { proveedor: "Farmacia Belgrano", cuit: "27-24118903-5", concepto: "Medicamentos y descartables" },
  { proveedor: "Insumos Aurora", cuit: "30-71455201-9", concepto: "Artículos de limpieza" },
  { proveedor: "Servicios Técnicos Rivas", cuit: "20-28776411-3", concepto: "Reparación de caldera" },
]

export async function extractInvoices(files: File[]): Promise<ExtractedInvoice[]> {
  const today = new Date()
  const emision = today.toISOString().split("T")[0]
  const vencimiento = new Date(today.getTime() + 15 * 86_400_000).toISOString().split("T")[0]

  const invoices: ExtractedInvoice[] = files.map((f, i) => {
    const s = DEMO_SUPPLIERS[i % DEMO_SUPPLIERS.length]
    return {
      proveedor: s.proveedor,
      cuit: s.cuit,
      concepto: s.concepto,
      fecha_emision: emision,
      fecha_vencimiento: vencimiento,
      importe: 480_000 + i * 137_500,
      comprobante: `A-0003-${String(90_100 + i).padStart(8, "0")}`,
      archivo: f.name,
      confianza: 0.94,
    }
  })

  return latency(invoices, 900)
}

export async function extractSalaries(files: File[]): Promise<ExtractedSalary[]> {
  const now = new Date()
  const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const sueldos: ExtractedSalary[] = files.map((f, i) => {
    const base = 1_450_000 + i * 85_000
    const bono = i % 4 === 0 ? 200_000 : 0
    const descuentos = Math.round(base * 0.17)

    return {
      legajo: String(i + 1).padStart(3, "0"),
      empleado: `Empleado Demo ${i + 1}`,
      periodo,
      sueldo_base: base,
      bono,
      descuentos,
      neto: base + bono - descuentos,
      contribuciones_total: Math.round(base * 0.27),
      contribuciones: [
        { concepto: "Contribución Jubilación", importe: Math.round(base * 0.16) },
        { concepto: "Obra Social", importe: Math.round(base * 0.06) },
        { concepto: "ART", importe: Math.round(base * 0.05) },
      ],
      archivo: f.name,
    }
  })

  return latency(sueldos, 900)
}
