import { useCallback, useEffect, useRef, useState } from "react"

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from "@mui/material"

import CancelIcon from "@mui/icons-material/Cancel"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"

import type { Guest } from "../types/guest"
import type { BillingEstado } from "../services/billing"
import { fetchGuests } from "../services/guests"
import { generateMonthlyCharges, fetchBillingStatuses, upsertBillingStatuses } from "../services/billing"
import { triggerBillingMailBatch, triggerGuestBilling, type FacturaLinea } from "../services/n8n"
import UpdatePriceModal from "../components/UpdatePriceModal"

// Colores/etiquetas del chip de estado de facturación.
const ESTADO_STYLE: Record<BillingEstado, { label: string; bg: string; color: string }> = {
  facturado: { label: "Facturado", bg: "#D8E7D3", color: "#4F6F52" },
  enviado: { label: "Enviado", bg: "#DCE6F5", color: "#2A4E7A" },
  pendiente: { label: "Pendiente", bg: "#E5E1DC", color: "#7A746E" },
}

// Forma de facturación (por corrida). OS = obra social (parte exenta).
type Forma = "os_resto_exento" | "os_resto_iva21" | "total_iva21" | "total_iva105"

// Resultado de facturación por huésped, para el diálogo.
// mailSent === false => el CAE se emitió pero el mail no salió (revisar envío).
type FacturaResult = { guestName: string; ok: boolean; mailSent?: boolean; detail: string }

const hasExento = (g: Guest) => (g.monto_exento ?? 0) > 0

// Arma las líneas de factura de un huésped facturable según la forma elegida.
function buildFacturas(g: Guest, forma: Forma): FacturaLinea[] {
  const cuota = g.cuota_mensual ?? 0
  const exento = g.monto_exento ?? 0
  const restante = Math.round((cuota - exento) * 100) / 100
  if (forma === "total_iva21") return [{ tipo: "iva21", importe: cuota }]
  if (forma === "total_iva105") return [{ tipo: "iva105", importe: cuota }]
  // formas OS: factura exenta por el monto de obra social + restante (exento o 21%)
  const lines: FacturaLinea[] = [{ tipo: "exento", importe: exento }]
  if (restante > 0) {
    lines.push({ tipo: forma === "os_resto_iva21" ? "iva21" : "exento", importe: restante })
  }
  return lines
}

// IVA (débito fiscal) de un huésped según la forma. Las líneas exentas no gravan;
// cada forma gravada usa su alícuota (21% o 10,5%).
function guestIVA(g: Guest, forma: Forma): number {
  const cuota = g.cuota_mensual ?? 0
  const exento = g.monto_exento ?? 0
  if (forma === "total_iva21") return cuota - cuota / 1.21
  if (forma === "total_iva105") return cuota - cuota / 1.105
  if (forma === "os_resto_iva21") {
    const resto = Math.max(0, cuota - exento)
    return resto - resto / 1.21
  }
  return 0 // os_resto_exento: todo exento
}

// ── Validaciones previas (antes de mandar la request a n8n) ──────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function isValidEmail(email?: string): boolean {
  return !!email && EMAIL_RE.test(email.trim())
}
function cuitDigits(cuit?: string): string {
  return (cuit ?? "").replace(/\D/g, "")
}

// Valida un facturable antes de emitir+enviar. Devuelve el motivo del rechazo, o null si está OK.
function validateForBilling(g: Guest, forma: Forma): string | null {
  const cuota = g.cuota_mensual ?? 0
  if (cuota <= 0) return "Sin cuota mensual configurada"
  const exento = g.monto_exento ?? 0
  if (exento < 0) return "Monto de obra social inválido (negativo)"
  if (exento > cuota) return "El monto de obra social supera la cuota"
  if ((forma === "os_resto_exento" || forma === "os_resto_iva21") && exento <= 0)
    return "Forma con obra social pero sin monto de obra social cargado"
  const facturas = buildFacturas(g, forma)
  if (facturas.length === 0 || facturas.some(f => f.importe <= 0))
    return "Montos inválidos (revisá cuota / monto obra social)"
  if (!g.contacto_email?.trim()) return "Falta el email de contacto"
  if (!isValidEmail(g.contacto_email)) return "Email de contacto inválido"
  if (!g.cuit?.trim()) return "Falta el CUIT (obligatorio para facturar)"
  if (cuitDigits(g.cuit).length !== 11) return "CUIT inválido (deben ser 11 dígitos)"
  return null
}

// Valida un no-facturable antes de mandarle el aviso por mail.
function validateForAviso(g: Guest): string | null {
  if ((g.cuota_mensual ?? 0) <= 0) return "Sin cuota mensual configurada"
  if (!g.contacto_email?.trim()) return "Falta el email de contacto"
  if (!isValidEmail(g.contacto_email)) return "Email de contacto inválido"
  return null
}

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthLabel(yyyyMM: string) {
  const d = new Date(yyyyMM + "-01T00:00:00")
  const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function BillingPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [billFlags, setBillFlags] = useState<Record<string, boolean>>({})
  const [formas, setFormas] = useState<Record<string, Forma>>({})
  const [estados, setEstados] = useState<Record<string, BillingEstado>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [period, setPeriod] = useState(currentMonth())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [facturaResults, setFacturaResults] = useState<FacturaResult[]>([])
  const [avisosAttempted, setAvisosAttempted] = useState(0)
  const [n8nError, setN8nError] = useState<string | null>(null)
  const [openResults, setOpenResults] = useState(false)
  const [openUpdatePrices, setOpenUpdatePrices] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined)
  const tableRef = useRef<HTMLDivElement>(null)

  // Cantidad de filas según viewport, alto de fila DINÁMICO para que llene todo
  // el espacio sin recortar. Clave: mido el alto NATURAL de la fila más alta
  // para no pedir más filas de las que entran — el `height` de un <tr> es un
  // mínimo, así que nunca se comprime por debajo de su contenido.
  const recalcRows = useCallback(() => {
    const el = tableRef.current
    if (!el) return
    const headerH = el.querySelector("thead")?.getBoundingClientRect().height ?? 40
    const pagerH = el.querySelector(".MuiTablePagination-root")?.getBoundingClientRect().height ?? 54
    const dataRows = [...el.querySelectorAll<HTMLElement>("tbody tr")]
      .filter((r) => r.querySelectorAll("td").length > 1) // ignorar placeholder/relleno
    // medir alto NATURAL quitando temporalmente el height forzado (síncrono)
    let natural = 0
    const saved = dataRows.map((r) => r.style.height)
    dataRows.forEach((r) => { r.style.height = "auto" })
    dataRows.forEach((r) => { natural = Math.max(natural, r.getBoundingClientRect().height) })
    dataRows.forEach((r, i) => { r.style.height = saved[i] })
    if (natural === 0) natural = 56 // fallback mientras carga
    const avail = el.clientHeight - headerH - pagerH
    const rows = Math.max(1, Math.floor(avail / natural))
    setRowsPerPage(rows)
    setRowHeight(Math.floor(avail / rows))
  }, [])

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const raf = requestAnimationFrame(recalcRows)
    const ro = new ResizeObserver(recalcRows)
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [recalcRows])

  // Recalcular cuando termina de cargar
  useEffect(() => { if (!loading) recalcRows() }, [loading, recalcRows])

  async function fetchData() {
    setLoading(true)
    setFetchError(null)
    try {
      const list = await fetchGuests(true)
      setGuests(list)
      const flags: Record<string, boolean> = {}
      list.forEach(g => { flags[g.id] = !!(g.cuota_mensual && g.cuota_mensual > 0) })
      setBillFlags(flags)
      setSelectedIds(list.map(g => g.id))
    } catch {
      setFetchError("No se pudo cargar la lista de huéspedes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Estado de facturación por período (facturado / enviado / pendiente)
  useEffect(() => {
    fetchBillingStatuses(period).then(setEstados).catch(() => setEstados({}))
  }, [period])

  // Forma de facturación efectiva (default según si tiene monto de obra social).
  function formaFor(g: Guest): Forma {
    return formas[g.id] ?? (hasExento(g) ? "os_resto_exento" : "total_iva21")
  }

  // Seleccionados en la corrida (para factura o para aviso).
  const selectedInScope = guests.filter(g => selectedIds.includes(g.id))
  // Lo que realmente se va a facturar: seleccionados (checkbox) Y con Facturar on.
  const billableGuests = selectedInScope.filter(g => billFlags[g.id])
  const totalAmount = billableGuests.reduce((sum, g) => sum + (g.cuota_mensual ?? 0), 0)
  // IVA por huésped según su forma/alícuota (21% o 10,5%); las exentas no suman.
  const totalIVA = Math.round(billableGuests.reduce((sum, g) => sum + guestIVA(g, formaFor(g)), 0))
  const totalNet = totalAmount - totalIVA

  function toggleBill(id: string, value: boolean) {
    setBillFlags(prev => ({ ...prev, [id]: value }))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    setSelectedIds(prev => prev.length === guests.length ? [] : guests.map(g => g.id))
  }

  async function handleGenerate() {
    // Solo se procesan los SELECCIONADOS (checkbox). Dentro de esos, el switch
    // "Facturar" decide factura (AFIP) vs aviso. Un huésped no seleccionado no
    // se genera aunque tenga el toggle de facturar activado.
    const inScope = guests.filter(g => selectedIds.includes(g.id))
    const facturables = inScope.filter(g => billFlags[g.id])
    const noFacturables = inScope.filter(g => !billFlags[g.id])
    // Basta con tener algún seleccionado: puede ser solo-avisos (todos con Facturar off).
    if (inScope.length === 0) return

    const guestName = (g: Guest) => `${g.apellido}, ${g.nombre}`

    // ── Facturables ──────────────────────────────────────────────
    // Ya facturados: NO se re-emiten (duplicaría la factura en AFIP).
    const alreadyBilled = facturables.filter(g => estados[g.id] === "facturado")
    // Pendientes → se validan los datos ANTES de mandar la request. Los inválidos
    // no se envían: quedan como error en el resumen.
    const pendingBill = facturables.filter(g => estados[g.id] !== "facturado")
    const toBill: Guest[] = []
    const billInvalid: FacturaResult[] = []
    for (const g of pendingBill) {
      const err = validateForBilling(g, formaFor(g))
      if (err) billInvalid.push({ guestName: guestName(g), ok: false, detail: err })
      else toBill.push(g)
    }

    // ── Avisos ───────────────────────────────────────────────────
    // No se reenvían a los ya procesados (enviado o facturado); los pendientes se validan.
    const alreadyNotified = noFacturables.filter(g => estados[g.id] === "enviado" || estados[g.id] === "facturado")
    const pendingNotify = noFacturables.filter(g => estados[g.id] !== "enviado" && estados[g.id] !== "facturado")
    const toNotify: Guest[] = []
    const notifyInvalid: FacturaResult[] = []
    for (const g of pendingNotify) {
      const err = validateForAviso(g)
      if (err) notifyInvalid.push({ guestName: guestName(g), ok: false, detail: err })
      else toNotify.push(g)
    }

    setGenerating(true)
    setN8nError(null)
    setFacturaResults([])
    setAvisosAttempted(0)
    setProgress(0)

    const periodLabel = formatMonthLabel(period)
    const doneEstados: { huesped_id: string; estado: BillingEstado }[] = []

    try {
      // Cargos (ingresos) para TODOS los que se procesan: facturables Y avisados. El aviso
      // es solo la notificación; la cuota se debe igual, así que el cargo va en ambos casos.
      // (generateMonthlyCharges es idempotente: no duplica si el cargo del período ya existe.)
      const res = await generateMonthlyCharges([...toBill, ...toNotify], period)

      // a) Avisos a los NO facturables (solo pendientes) — workflow SEPARADO, se dispara
      // SIN await: corre en n8n EN PARALELO mientras el browser factura al resto.
      setAvisosAttempted(toNotify.length)
      const avisosPromise: Promise<string | null> | null = toNotify.length > 0
        ? triggerBillingMailBatch({
            tipo: "aviso",
            period,
            periodLabel,
            guests: toNotify.map(g => ({
              id: g.id,
              nombre: g.nombre,
              apellido: g.apellido,
              cobertura: g.cobertura,
              contacto: { nombre: g.contacto_nombre, email: g.contacto_email, telefono: g.contacto_telefono },
              cuota: g.cuota_mensual ?? 0,
            })),
          })
            .then(() => null)
            .catch((e: unknown) => (e instanceof Error ? e.message : "No se pudieron enviar los avisos."))
        : null

      // b) Facturables — uno por uno, secuencial (numeración AFIP). El resumen arranca con
      // todos los rechazos previos: ya procesados + datos inválidos (no se mandó su request).
      const out: FacturaResult[] = [
        ...alreadyBilled.map(g => ({
          guestName: guestName(g),
          ok: false,
          detail: "Ya facturado en este período — no se re-emite",
        })),
        ...alreadyNotified.map(g => ({
          guestName: guestName(g),
          ok: false,
          detail: estados[g.id] === "facturado"
            ? "Ya facturado en este período — no se reenvía aviso"
            : "Ya enviado en este período — no se reenvía",
        })),
        ...billInvalid,
        ...notifyInvalid,
      ]
      for (let i = 0; i < toBill.length; i++) {
        const g = toBill[i]
        setProgress(i + 1)
        const name = guestName(g)
        const facturas = buildFacturas(g, formaFor(g))
        try {
          const r = await triggerGuestBilling({
            tipo: "factura",
            period,
            periodLabel,
            guest: {
              id: g.id,
              nombre: g.nombre,
              apellido: g.apellido,
              cuit: g.cuit,
              cobertura: g.cobertura,
              contacto: { nombre: g.contacto_nombre, email: g.contacto_email, telefono: g.contacto_telefono },
            },
            facturas,
          })
          // Fail-closed: SOLO se marca facturado si el workflow confirma ok:true.
          // Cualquier otra respuesta (ok:false, cuerpo inesperado, 200 sin ok) => error,
          // no se marca facturado. Así un fallo de n8n nunca da falso positivo.
          if (r.ok === true) {
            // Hay CAE => facturado, aunque el mail haya fallado. mailEnviado === false
            // significa emitido-pero-no-entregado: se marca Facturado igual (no re-emitir),
            // solo se avisa para reintentar el envío.
            const mailSent = r.mailEnviado !== false
            doneEstados.push({ huesped_id: g.id, estado: "facturado" })
            out.push({
              guestName: name,
              ok: true,
              mailSent,
              detail: mailSent
                ? `${facturas.length} factura${facturas.length !== 1 ? "s" : ""}`
                : "Facturado — revisar envío de mail",
            })
          } else {
            out.push({
              guestName: name,
              ok: false,
              detail: String(r.error ?? "El workflow no confirmó el CAE (revisá la ejecución en n8n)."),
            })
          }
        } catch (e: unknown) {
          out.push({ guestName: name, ok: false, detail: e instanceof Error ? e.message : "Error" })
        }
      }
      setFacturaResults(out)

      // Esperar el workflow de avisos que venía corriendo en paralelo
      if (avisosPromise) {
        const avisoErr = await avisosPromise
        if (avisoErr) setN8nError(avisoErr)
        else toNotify.forEach(g => doneEstados.push({ huesped_id: g.id, estado: "enviado" }))
      }

      // Persistir estados OK (facturado / enviado)
      if (doneEstados.length > 0) {
        try {
          await upsertBillingStatuses(period, doneEstados)
          setEstados(prev => {
            const next = { ...prev }
            doneEstados.forEach(e => { next[e.huesped_id] = e.estado })
            return next
          })
        } catch { /* el estado no es crítico */ }
      }

      setOpenResults(true)

      const okFact = out.filter(r => r.ok).length
      const mailIssues = out.filter(r => r.ok && r.mailSent === false).length
      const cargos = res.filter(r => r.status === "created").length
      const parts: string[] = []
      if (okFact > 0) parts.push(`${okFact} facturado${okFact !== 1 ? "s" : ""}`)
      if (cargos > 0) parts.push(`${cargos} cargo${cargos !== 1 ? "s" : ""} generado${cargos !== 1 ? "s" : ""}`)
      if (mailIssues > 0) parts.push(`${mailIssues} sin envío de mail`)
      if (parts.length) setSuccessMessage(parts.join(" · ") + ".")
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }

  function handlePricesUpdated(summary: string) {
    setSuccessMessage(summary)
    fetchData()
  }

  return (
    <Box sx={{ p: 2, flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Facturación mensual</Typography>
          <Typography variant="body2" color="text.secondary">{formatMonthLabel(period)}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="Período"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />
          <Button
            variant="outlined"
            onClick={() => setOpenUpdatePrices(true)}
            disabled={selectedIds.length === 0}
          >
            Actualizar cuotas
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || selectedInScope.length === 0}
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {generating
              ? (billableGuests.length > 0 ? `Facturando… ${progress}/${billableGuests.length}` : "Enviando avisos…")
              : "Generar cargos"}
          </Button>
        </Box>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 2 }}>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="subtitle2" color="text.secondary" noWrap>Total facturado</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(totalAmount)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {billableGuests.length} a facturar
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="subtitle2" color="text.secondary" noWrap>IVA</Typography>
            <Typography variant="h5" sx={{ color: "#C62828", fontWeight: 700, mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(totalIVA)}</Typography>
            <Typography variant="caption" color="text.secondary">21% débito fiscal</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="subtitle2" color="text.secondary" noWrap>Neto</Typography>
            <Typography variant="h5" sx={{ color: "#2E7D32", fontWeight: 700, mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(totalNet)}</Typography>
            <Typography variant="caption" color="text.secondary">Ingreso real estimado</Typography>
          </CardContent>
        </Card>
      </Box>

      {fetchError && <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>}

      {/* Guests table */}
      <Paper ref={tableRef} sx={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
          <Table stickyHeader>
            <TableHead>
            <TableRow>
              <TableCell align="center" width={70}>
                <Checkbox
                  size="small"
                  sx={{ p: 0.5 }}
                  checked={selectedIds.length === guests.length && guests.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < guests.length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Huésped</TableCell>
              <TableCell>Cuota</TableCell>
              <TableCell>Facturar</TableCell>
              <TableCell>Cobertura</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  Cargando...
                </TableCell>
              </TableRow>
            ) : guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No hay huéspedes activos
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const slice = guests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                const empty = Math.max(0, rowsPerPage - slice.length)
                return <>
                  {slice.map((guest) => {
                    const hasFee = guest.cuota_mensual && guest.cuota_mensual > 0
                    return (
                      <TableRow key={guest.id} hover sx={{ height: rowHeight }}>
                    <TableCell align="center">
                      <Checkbox
                        size="small"
                        sx={{ p: 0.5 }}
                        checked={selectedIds.includes(guest.id)}
                        onChange={() => toggleSelect(guest.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {guest.apellido}, {guest.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>
                        {hasFee ? fmt(guest.cuota_mensual!) : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
                        <Switch
                          size="small"
                          color="warning"
                          checked={!!billFlags[guest.id]}
                          onChange={(e) => toggleBill(guest.id, e.target.checked)}
                          disabled={!hasFee}
                        />
                        {billFlags[guest.id] && (
                          <Select
                            size="small"
                            value={formaFor(guest)}
                            onChange={(e) => setFormas(prev => ({ ...prev, [guest.id]: e.target.value as Forma }))}
                            sx={{ fontSize: 12, minWidth: 190, "& .MuiSelect-select": { py: 0.4 } }}
                          >
                            <MenuItem value="os_resto_exento" disabled={!hasExento(guest)} sx={{ fontSize: 12 }}>OS exenta + resto exento</MenuItem>
                            <MenuItem value="os_resto_iva21" disabled={!hasExento(guest)} sx={{ fontSize: 12 }}>OS exenta + resto IVA 21%</MenuItem>
                            <MenuItem value="total_iva21" sx={{ fontSize: 12 }}>Total con IVA 21%</MenuItem>
                            <MenuItem value="total_iva105" sx={{ fontSize: 12 }}>Total con IVA 10,5%</MenuItem>
                          </Select>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{guest.cobertura ?? "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const est = ESTADO_STYLE[estados[guest.id] ?? "pendiente"]
                        return (
                          <Chip
                            label={est.label}
                            size="small"
                            sx={{ backgroundColor: est.bg, color: est.color, fontWeight: 700 }}
                          />
                        )
                      })()}
                    </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* relleno: filas vacías para mantener el alto del cuerpo */}
                  {Array.from({ length: empty }).map((_, i) => (
                    <TableRow key={`empty-${i}`} sx={{ height: rowHeight, "&:hover": { backgroundColor: "transparent" } }}>
                      <TableCell colSpan={6} sx={{ border: 0 }} />
                    </TableRow>
                  ))}
                </>
              })()
            )}
          </TableBody>
        </Table>
        </TableContainer>
        <Divider sx={{ flexShrink: 0 }} />
        <TablePagination
          component="div"
          count={guests.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, overflow: "hidden" }}
        />
      </Paper>

      {/* Update prices modal */}
      <UpdatePriceModal
        open={openUpdatePrices}
        onClose={() => setOpenUpdatePrices(false)}
        guestIds={selectedIds}
        onSaved={handlePricesUpdated}
      />

      {/* Results dialog */}
      <Dialog open={openResults} onClose={() => setOpenResults(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resultado de la facturación</DialogTitle>
        <DialogContent>
          {/* Estado del batch de avisos (solo si se intentó enviar alguno) */}
          {avisosAttempted > 0 && (n8nError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No se pudieron enviar los avisos: {n8nError}
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              {avisosAttempted} aviso{avisosAttempted !== 1 ? "s" : ""} enviado{avisosAttempted !== 1 ? "s" : ""}.
            </Alert>
          ))}


          {/* Resultado de facturación por huésped */}
          {facturaResults.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
              {facturaResults.map((r, i) => {
                // 3 estados: error (ok:false), facturado-sin-mail (ok:true + mailSent:false), ok pleno.
                const state = !r.ok ? "error" : r.mailSent === false ? "warning" : "success"
                return (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {state === "success" && <CheckCircleIcon color="success" fontSize="small" />}
                    {state === "warning" && <WarningAmberIcon color="warning" fontSize="small" />}
                    {state === "error" && <CancelIcon color="error" fontSize="small" />}
                    <Typography variant="body2" sx={{ flex: 1 }}>{r.guestName}</Typography>
                    <Chip
                      size="small"
                      label={r.detail}
                      color={state}
                      variant="outlined"
                    />
                  </Box>
                )
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResults(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  )
}
