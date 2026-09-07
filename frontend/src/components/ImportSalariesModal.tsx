import { useEffect, useState } from "react"

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"

import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined"

import AddIcon from "@mui/icons-material/Add"

import type { ExtractedSalary } from "../types/salary"
import type { PaymentMethod } from "../types/paymentMethod"
import { createSalaryWithContributions } from "../services/outflows"
import { fetchEmployees, upsertEmployee } from "../services/employees"
import { fetchPaymentMethods } from "../services/paymentMethods"
import { CATEGORIAS_EMPLEADO } from "../constants/categorias"

type Props = {
  open: boolean
  salaries: ExtractedSalary[]
  onClose: () => void
  onSaved: () => void
}

// Una contribución patronal editable (se guarda como egreso IMPUESTO pendiente).
type ContribRow = { concepto: string; importe: string }

type Row = {
  key: string
  legajo: string
  empleado: string
  categoria: string
  periodo: string          // YYYY-MM
  sueldo_base: string      // bruto (remunerativo)
  presentismo: string
  pasaje: string
  bono: string
  neto: string             // NETO del recibo = importe del egreso (lo que se paga)
  contribuciones: ContribRow[]   // contribuciones patronales → egresos IMPUESTO
  contribuciones_total: string   // SUB TOTAL CONTRIBUCIONES EMPLEADOR (control)
  pagada: boolean          // si se registra el pago junto con el sueldo
  fecha_pago: string
  metodo_pago_id: string
  archivo?: string
  advertencia?: string
  saving: boolean
  error: string | null
}

// fecha_emisión = último día del mes del período (devengamiento del sueldo)
function periodoToFecha(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number)
  if (!y || !m) return new Date().toISOString().split("T")[0]
  const last = new Date(y, m, 0).getDate()
  return `${periodo}-${String(last).padStart(2, "0")}`
}

function toRow(s: ExtractedSalary, i: number): Row {
  return {
    key: `${i}-${s.archivo ?? s.legajo ?? Math.random()}`,
    legajo: s.legajo ?? "",
    empleado: s.empleado ?? "",
    categoria: "", // se completa desde la maestra `empleados` (por legajo) tras el fetch
    periodo: s.periodo ?? new Date().toISOString().slice(0, 7),
    sueldo_base: s.sueldo_base != null ? String(s.sueldo_base) : "",
    presentismo: "0",
    pasaje: "0",
    bono: s.bono != null ? String(s.bono) : "0",
    neto: s.neto != null ? String(s.neto) : "",
    contribuciones: (s.contribuciones ?? []).map(c => ({
      concepto: c.concepto,
      importe: c.importe != null ? String(c.importe) : ""
    })),
    contribuciones_total: s.contribuciones_total != null ? String(s.contribuciones_total) : "",
    pagada: false,
    fecha_pago: new Date().toISOString().split("T")[0],
    metodo_pago_id: "",
    archivo: s.archivo,
    advertencia: s.advertencia,
    saving: false,
    error: null
  }
}

// Etiqueta legible del período: "2026-07" → "07/2026"
function periodoLabel(periodo: string): string {
  const [y, m] = periodo.split("-")
  return m && y ? `${m}/${y}` : periodo
}

// Descripción (concepto) del egreso IMPUESTO de una contribución patronal.
function contribConcepto(base: string, row: Row): string {
  const quien = row.empleado.trim() || (row.legajo ? `legajo ${row.legajo}` : "")
  return `Contrib. patronal ${base}${quien ? ` · ${quien}` : ""} · ${periodoLabel(row.periodo)}`
}

// Importe del egreso = NETO impreso en el recibo (lo que efectivamente se paga)
function totalRow(r: Row): number {
  return Number(r.neto || 0)
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
}

// Formatea un string numérico crudo ("1609177") al formato es-AR ("1.609.177,00").
function formatAmount(raw: string): string {
  if (!raw) return ""
  const n = Number(raw)
  if (!isFinite(n)) return raw
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Limpia lo que tipea el usuario a un número crudo con punto decimal
// ("1.609.177,50" → "1609177.50"). Tolera separadores de miles y coma decimal.
function sanitizeAmount(text: string): string {
  const s = text.replace(/[^\d.,]/g, "")
  const lastSep = Math.max(s.lastIndexOf(","), s.lastIndexOf("."))
  if (lastSep === -1) return s
  const intPart = s.slice(0, lastSep).replace(/[.,]/g, "")
  const decPart = s.slice(lastSep + 1).replace(/[.,]/g, "")
  return `${intPart}.${decPart}`
}

// Campo de monto: muestra formato es-AR al perder foco, crudo al editar.
function AmountField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <TextField
      size="small"
      label={label}
      value={focused ? value : formatAmount(value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(sanitizeAmount(e.target.value))}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
        htmlInput: { inputMode: "decimal" }
      }}
      fullWidth
    />
  )
}

// Los errores de Supabase (PostgrestError) NO son instancias de Error: son objetos
// { message, details, hint, code }. Extraemos el mensaje real para no perderlo.
function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown }
    const parts = [o.message, o.details, o.hint].filter(
      (p): p is string => typeof p === "string" && p.length > 0
    )
    if (parts.length) return parts.join(" — ")
  }
  return "No se pudo guardar."
}

export default function ImportSalariesModal({ open, salaries, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [employees, setEmployees] = useState<Record<string, string>>({})
  const [savedCount, setSavedCount] = useState(0)
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [progress, setProgress] = useState(0)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  useEffect(() => {
    if (!open) return
    setRows(salaries.map(toRow))
    setSavedCount(0)
    setConfirmingAll(false)
    setProgress(0)
    // traer la maestra de empleados y pre-cargar la categoría por legajo
    fetchEmployees()
      .then((emps) => {
        const map: Record<string, string> = {}
        for (const e of emps) map[e.legajo] = e.categoria ?? ""
        setEmployees(map)
        setRows(prev =>
          prev.map(r => (map[r.legajo] ? { ...r, categoria: map[r.legajo] } : r))
        )
      })
      .catch(() => {})
    fetchPaymentMethods().then(setPaymentMethods).catch(() => {})
  }, [open, salaries])

  function patch(key: string, changes: Partial<Row>) {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...changes } : r)))
  }

  function patchContrib(key: string, idx: number, changes: Partial<ContribRow>) {
    setRows(prev => prev.map(r =>
      r.key === key
        ? { ...r, contribuciones: r.contribuciones.map((c, i) => (i === idx ? { ...c, ...changes } : c)) }
        : r
    ))
  }

  function removeContrib(key: string, idx: number) {
    setRows(prev => prev.map(r =>
      r.key === key ? { ...r, contribuciones: r.contribuciones.filter((_, i) => i !== idx) } : r
    ))
  }

  function addContrib(key: string) {
    setRows(prev => prev.map(r =>
      r.key === key ? { ...r, contribuciones: [...r.contribuciones, { concepto: "", importe: "" }] } : r
    ))
  }

  function discard(key: string) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  // Suma de las contribuciones con importe > 0 (para el control contra el subtotal).
  function sumaContrib(row: Row): number {
    return row.contribuciones.reduce((a, c) => a + (Number(c.importe) || 0), 0)
  }

  function validateRow(row: Row): string | null {
    const legajo = row.legajo.trim()
    if (!legajo) return "Falta el legajo."
    // Chequeo instantáneo contra la maestra ya cargada (la FK lo valida en la base igual).
    if (Object.keys(employees).length > 0 && !(legajo in employees))
      return `El legajo ${legajo} no existe en la tabla de empleados.`
    if (!row.sueldo_base || Number(row.sueldo_base) <= 0) return "Sueldo base inválido."
    if (totalRow(row) <= 0) return "El neto debe ser mayor a cero."
    if (row.pagada && !row.metodo_pago_id) return "Elegí el método de pago."
    return null
  }

  // Guarda el sueldo + upsert del empleado. Lanza error si el sueldo falla.
  // Si la fila está marcada como pagada, el egreso se registra con pago.
  async function saveRow(row: Row) {
    const legajo = row.legajo.trim()
    // Contribuciones patronales → egresos IMPUESTO pendientes (sólo las que tienen importe).
    const contribuciones = row.contribuciones
      .filter(c => c.concepto.trim() && Number(c.importe) > 0)
      .map(c => ({ concepto: contribConcepto(c.concepto.trim(), row), importe: Number(c.importe) }))
    try {
      await createSalaryWithContributions(
        {
          fecha_emision: periodoToFecha(row.periodo), // último día del período
          importe: totalRow(row),
          observaciones: row.empleado.trim() || undefined,
          fecha_pago: row.pagada ? row.fecha_pago : undefined,
          metodo_pago_id: row.pagada ? row.metodo_pago_id : undefined
        },
        {
          legajo,
          periodo: `${row.periodo}-01`,
          sueldo_base: Number(row.sueldo_base),
          presentismo: Number(row.presentismo || 0),
          horas_extra: 0,
          pasaje: Number(row.pasaje || 0),
          bono: Number(row.bono || 0)
        },
        contribuciones
      )
    } catch (e) {
      // 23503 = foreign_key_violation → el legajo no existe en empleados
      if (e && typeof e === "object" && (e as { code?: string }).code === "23503")
        throw new Error(`El legajo ${legajo} no existe en la tabla de empleados.`)
      throw e
    }
    // actualizar la categoría del empleado en la maestra (best-effort, no bloquea).
    // Solo si hay categoría, para no pisar con vacío la que ya tenga cargada.
    if (row.categoria.trim()) {
      try {
        await upsertEmployee(legajo, row.categoria.trim())
        setEmployees(prev => ({ ...prev, [legajo]: row.categoria.trim() }))
      } catch { /* si falla, el sueldo igual quedó guardado */ }
    }
  }

  async function confirmAll() {
    setConfirmingAll(true)
    const current = rows
    const okKeys: string[] = []
    const errById: Record<string, string> = {}

    for (let idx = 0; idx < current.length; idx++) {
      const row = current[idx]
      setProgress(idx + 1)
      const err = validateRow(row)
      if (err) { errById[row.key] = err; continue }
      try {
        await saveRow(row)
        okKeys.push(row.key)
      } catch (e: unknown) {
        errById[row.key] = errMessage(e)
      }
    }

    setSavedCount(c => c + okKeys.length)
    setRows(prev =>
      prev
        .filter(r => !okKeys.includes(r.key))
        .map(r => (errById[r.key] ? { ...r, error: errById[r.key], saving: false } : r))
    )
    setProgress(0)
    setConfirmingAll(false)
  }

  function handleClose() {
    if (savedCount > 0) onSaved()
    onClose()
  }

  const pending = rows.length

  // opciones del desplegable: lista base + categorías ya usadas en la maestra
  const categoriaOptions = Array.from(
    new Set([...CATEGORIAS_EMPLEADO, ...Object.values(employees).filter(Boolean)])
  ).sort((a, b) => a.localeCompare(b))

  // Totales por concepto sumando TODOS los recibos (para la barra del footer)
  const totales = rows.reduce(
    (a, r) => ({
      neto: a.neto + Number(r.neto || 0),
      presentismo: a.presentismo + Number(r.presentismo || 0),
      pasaje: a.pasaje + Number(r.pasaje || 0)
    }),
    { neto: 0, presentismo: 0, pasaje: 0 }
  )

  const amountField = (row: Row, label: string, field: keyof Row) => (
    <AmountField
      label={label}
      value={row[field] as string}
      onChange={(v) => patch(row.key, { [field]: v } as Partial<Row>)}
    />
  )

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Revisar recibos de sueldo
        {pending > 0 && ` · ${pending} pendiente${pending !== 1 ? "s" : ""}`}
      </DialogTitle>
      <DialogContent dividers>
        {pending === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography>
              {savedCount > 0
                ? `Se registraron ${savedCount} sueldo${savedCount !== 1 ? "s" : ""}.`
                : "No hay recibos para revisar."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {rows.map((row) => {
              return (
                <Card key={row.key} variant="outlined">
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>
                          {row.empleado || (row.legajo ? `Legajo ${row.legajo}` : "Recibo")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {`Legajo ${row.legajo || "—"}`}
                        </Typography>
                      </Box>
                      <Tooltip title="Descartar">
                        <IconButton size="small" color="error" onClick={() => discard(row.key)} disabled={row.saving || confirmingAll}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {row.advertencia && <Alert severity="warning">{row.advertencia}</Alert>}
                    {row.error && <Alert severity="error">{row.error}</Alert>}

                    <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 2 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={categoriaOptions}
                        value={row.categoria}
                        onInputChange={(_, v) => patch(row.key, { categoria: v })}
                        renderInput={(params) => (
                          <TextField {...params} label="Categoría" placeholder="Elegí o escribí una categoría" fullWidth />
                        )}
                      />
                      <TextField
                        size="small"
                        label="Período"
                        type="month"
                        value={row.periodo}
                        onChange={(e) => patch(row.key, { periodo: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                        fullWidth
                      />
                    </Box>

                    {/* Adicionales: lo que se paga POR FUERA del neto (el bono ya está en el neto) */}
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                      {amountField(row, "Presentismo", "presentismo")}
                      {amountField(row, "Pasaje", "pasaje")}
                    </Box>

                    {/* Neto del recibo = importe del egreso (editable) */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">Neto (total a pagar)</Typography>
                      <Box sx={{ width: 220 }}>
                        {amountField(row, "Neto", "neto")}
                      </Box>
                    </Box>

                    {/* Contribuciones patronales → se guardan como egresos IMPUESTO pendientes */}
                    <Box sx={{ borderTop: "1px dashed", borderColor: "divider", pt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          Contribuciones patronales (se guardan como impuestos, pendientes)
                        </Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => addContrib(row.key)}>
                          Agregar
                        </Button>
                      </Box>

                      {row.contribuciones.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          No se detectaron contribuciones. Agregá una si el recibo las trae.
                        </Typography>
                      )}

                      {row.contribuciones.map((c, idx) => (
                        <Box key={idx} sx={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 1, alignItems: "center" }}>
                          <TextField
                            size="small"
                            label="Concepto"
                            value={c.concepto}
                            onChange={(e) => patchContrib(row.key, idx, { concepto: e.target.value })}
                            fullWidth
                          />
                          <AmountField
                            label="Importe"
                            value={c.importe}
                            onChange={(v) => patchContrib(row.key, idx, { importe: v })}
                          />
                          <Tooltip title="Quitar contribución">
                            <IconButton size="small" color="error" onClick={() => removeContrib(row.key, idx)} disabled={row.saving || confirmingAll}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}

                      {/* Control: la suma de las contribuciones debe dar el subtotal del recibo */}
                      {row.contribuciones.length > 0 && (() => {
                        const suma = sumaContrib(row)
                        const target = Number(row.contribuciones_total || 0)
                        const cuadra = target > 0 && Math.abs(suma - target) <= 1
                        return (
                          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, alignItems: "baseline" }}>
                            <Typography variant="caption" color="text.secondary">Suma contribuciones</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: target > 0 && !cuadra ? "warning.main" : "text.primary" }}>
                              {fmt(suma)}
                            </Typography>
                            {target > 0 && (
                              <Typography variant="caption" color={cuadra ? "success.main" : "warning.main"}>
                                {cuadra ? "✓ coincide con el subtotal" : `subtotal del recibo: ${fmt(target)}`}
                              </Typography>
                            )}
                          </Box>
                        )
                      })()}
                    </Box>

                    {/* Pago: registrar el egreso como pagado */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={row.pagada}
                            onChange={(e) => patch(row.key, { pagada: e.target.checked })}
                            color="success"
                          />
                        }
                        label="Ya está pagado"
                      />
                      {row.pagada && (
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, flex: 1, minWidth: 260 }}>
                          <TextField
                            select
                            size="small"
                            label="Método de pago"
                            value={row.metodo_pago_id}
                            onChange={(e) => patch(row.key, { metodo_pago_id: e.target.value })}
                            fullWidth
                          >
                            {paymentMethods.map((m) => (
                              <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            size="small"
                            label="Fecha de pago"
                            type="date"
                            value={row.fecha_pago}
                            onChange={(e) => patch(row.key, { fecha_pago: e.target.value })}
                            slotProps={{ inputLabel: { shrink: true } }}
                            fullWidth
                          />
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
      </DialogContent>
      {/* Barra de totales: suma de cada concepto sobre TODOS los recibos */}
      {pending > 0 && (
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            gap: 3,
            rowGap: 1,
            flexWrap: "wrap",
            alignItems: "center",
            bgcolor: "action.hover"
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Control de pago ({pending})
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">Suma presentismo</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(totales.presentismo)}</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">Suma pasaje</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(totales.pasaje)}</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">Suma netos</Typography>
            <Typography sx={{ fontWeight: 700, color: "success.main" }}>{fmt(totales.neto)}</Typography>
          </Box>
        </Box>
      )}

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={confirmingAll}>
          {pending === 0 ? "Cerrar" : "Cancelar"}
        </Button>
        {pending > 0 && (
          <Button
            variant="contained"
            onClick={confirmAll}
            disabled={confirmingAll}
            startIcon={confirmingAll ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {confirmingAll ? `Confirmando… ${progress}/${pending}` : `Confirmar todos (${pending})`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
