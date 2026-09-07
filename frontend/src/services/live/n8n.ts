import type { ExtractedInvoice } from "../../types/invoice"
import type { ExtractedSalary } from "../../types/salary"

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined
const WEBHOOK_TOKEN = import.meta.env.VITE_N8N_WEBHOOK_TOKEN as string | undefined
const FACTURAS_URL = import.meta.env.VITE_N8N_FACTURAS_URL as string | undefined
const SUELDOS_URL = import.meta.env.VITE_N8N_SUELDOS_URL as string | undefined
const AVISOS_URL = import.meta.env.VITE_N8N_AVISOS_URL as string | undefined
const AUMENTOS_URL = import.meta.env.VITE_N8N_AUMENTOS_URL as string | undefined

// ============================================================
// Facturación mensual — un solo webhook, discriminado por `tipo`.
// "aviso"   → 1 request con todos los NO facturables (solo mail, sin AFIP).
// "factura" → 1 request POR huésped facturable (AFIP, numeración secuencial).
// ============================================================

type BillingContacto = { nombre?: string; email?: string; telefono?: string }

// Una línea de factura ya calculada por la app.
// iva105 = alícuota reducida 10,5% (AlicIva Id 4 en AFIP); iva21 = 21% (Id 5).
export type FacturaLinea = { tipo: "exento" | "iva21" | "iva105"; importe: number }

// Batch de avisos: todos los no-facturables en un solo request.
export type BillingMailBatch = {
  tipo: "aviso"
  period: string
  periodLabel: string
  guests: {
    id: string
    nombre: string
    apellido: string
    cobertura?: string
    contacto: BillingContacto
    cuota: number
  }[]
}

// Un huésped facturable: la factura se emite a su nombre (CUIT), el mail va al contacto.
export type GuestBillingPayload = {
  tipo: "factura"
  period: string
  periodLabel: string
  guest: {
    id: string
    nombre: string
    apellido: string
    cuit?: string
    cobertura?: string
    contacto: BillingContacto
  }
  facturas: FacturaLinea[] // 1 o 2 líneas
}

// POST JSON a un webhook de n8n. Devuelve el body de la respuesta (o {}).
async function postJson(url: string | undefined, missing: string, payload: unknown): Promise<Record<string, unknown>> {
  if (!url) throw new Error(missing)
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (WEBHOOK_TOKEN) headers["Authorization"] = `Bearer ${WEBHOOK_TOKEN}`
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(`n8n respondió con status ${res.status}`)
  return res.json().catch(() => ({}))
}

// Avisos: workflow SEPARADO (solo mails). Corre en paralelo con la facturación.
export function triggerBillingMailBatch(p: BillingMailBatch): Promise<Record<string, unknown>> {
  return postJson(AVISOS_URL, "Falta VITE_N8N_AVISOS_URL en .env.local", p)
}

// Facturación: workflow con AFIP (un huésped por request).
export function triggerGuestBilling(p: GuestBillingPayload): Promise<Record<string, unknown>> {
  return postJson(WEBHOOK_URL, "Falta VITE_N8N_WEBHOOK_URL en .env.local", p)
}

// Batch de aumento de cuota: notifica el nuevo precio y el aumento a los afectados.
export type PriceIncreaseMailBatch = {
  tipo: "aumento"
  mode: "percentage" | "fixed"
  value: number // el % (si percentage) o el nuevo valor fijo (si fixed)
  guests: {
    id: string
    nombre: string
    apellido: string
    contacto: { nombre?: string; email?: string }
    cuotaAnterior: number
    cuotaNueva: number
  }[]
}

// Notificación de aumento: un batch con todos los afectados (solo mail, sin AFIP).
export function triggerPriceIncreaseMail(p: PriceIncreaseMailBatch): Promise<Record<string, unknown>> {
  return postJson(AUMENTOS_URL, "Falta VITE_N8N_AUMENTOS_URL en .env.local", p)
}

// ============================================================
// Subida de archivos a n8n — multipart, UN archivo por request
// ============================================================

// Manda un archivo como binario crudo (multipart/form-data). NO seteamos
// Content-Type: el browser agrega el boundary del multipart solo. n8n recibe el
// binario directo en la propiedad `file` (sin base64, sin transformación).
async function postFile(url: string, file: File): Promise<unknown> {
  const fd = new FormData()
  fd.append("file", file, file.name)

  const headers: Record<string, string> = {}
  if (WEBHOOK_TOKEN) headers["Authorization"] = `Bearer ${WEBHOOK_TOKEN}`

  const res = await fetch(url, { method: "POST", headers, body: fd })
  if (!res.ok) throw new Error(`n8n respondió con status ${res.status}`)
  return res.json()
}

// La respuesta de n8n puede venir como objeto único, arreglo, o { <key>: [...] }.
function toItems(data: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  const wrapped = (data as Record<string, unknown> | null)?.[key]
  if (Array.isArray(wrapped)) return wrapped as Record<string, unknown>[]
  if (data && typeof data === "object") return [data as Record<string, unknown>]
  return []
}

// ============================================================
// Importación de facturas (OCR/IA vía n8n)
// ============================================================

// Sube cada factura a n8n en su propio request (en paralelo). n8n las procesa con
// IA y devuelve los datos; el empleado revisa y confirma. Un archivo que falla no
// tumba a los demás — se marca con una advertencia para cargarlo a mano.
export async function extractInvoices(files: File[]): Promise<ExtractedInvoice[]> {
  if (!FACTURAS_URL) throw new Error("Falta VITE_N8N_FACTURAS_URL en .env.local")

  const results = await Promise.allSettled(files.map((f) => postFile(FACTURAS_URL!, f)))

  const invoices: ExtractedInvoice[] = []
  results.forEach((r, i) => {
    const archivo = files[i].name
    if (r.status === "fulfilled") {
      for (const it of toItems(r.value, "invoices")) {
        invoices.push({ ...(it as ExtractedInvoice), archivo: (it.archivo as string) ?? archivo })
      }
    } else {
      invoices.push({
        archivo,
        advertencia: `No se pudo procesar: ${r.reason instanceof Error ? r.reason.message : "error"}`,
      })
    }
  })
  return invoices
}

// ============================================================
// Importación de recibos de sueldo (PDF de texto vía n8n)
// ============================================================

// Sube cada recibo a n8n en su propio request. n8n extrae el texto del PDF y lo
// parsea (sin IA, gratis). El empleado revisa y confirma.
export async function extractSalaries(files: File[]): Promise<ExtractedSalary[]> {
  if (!SUELDOS_URL) throw new Error("Falta VITE_N8N_SUELDOS_URL en .env.local")

  const results = await Promise.allSettled(files.map((f) => postFile(SUELDOS_URL!, f)))

  const sueldos: ExtractedSalary[] = []
  results.forEach((r, i) => {
    const archivo = files[i].name
    if (r.status === "fulfilled") {
      for (const it of toItems(r.value, "sueldos")) {
        sueldos.push({ ...(it as ExtractedSalary), archivo: (it.archivo as string) ?? archivo })
      }
    } else {
      sueldos.push({
        archivo,
        advertencia: `No se pudo procesar: ${r.reason instanceof Error ? r.reason.message : "error"}`,
      })
    }
  })
  return sueldos
}
