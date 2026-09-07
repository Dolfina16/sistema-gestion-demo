import { useEffect, useState } from "react"

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography
} from "@mui/material"

import type { Outflow } from "../types/outflow"
import type { PaymentMethod } from "../types/paymentMethod"
import { createSalaryExpense, updateSalaryExpense } from "../services/outflows"
import { fetchPaymentMethods } from "../services/paymentMethods"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  outflow?: Outflow | null
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function AddSalaryModal({ open, onClose, onSaved, outflow }: Props) {
  const isEdit = !!outflow

  const [employeeId, setEmployeeId] = useState("")
  const [period, setPeriod] = useState(currentMonth())
  const [baseSalary, setBaseSalary] = useState("")
  const [attendance, setAttendance] = useState("0")
  const [transport, setTransport] = useState("0")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pago
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paid, setPaid] = useState(false)
  const [methodId, setMethodId] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0]
      if (isEdit && outflow?.sueldos) {
        const s = outflow.sueldos
        setEmployeeId(s.legajo)
        setPeriod(s.periodo.slice(0, 7))
        setBaseSalary(String(s.sueldo_base))
        setAttendance(String(s.presentismo))
        setTransport(String(s.pasaje ?? 0))
        setIssueDate(outflow.fecha_emision)
        setNotes(outflow.observaciones ?? "")
        setPaid(!!outflow.fecha_pago)
        setMethodId(outflow.metodo_pago_id ?? "")
        setPayDate(outflow.fecha_pago ?? today)
      } else {
        setEmployeeId("")
        setPeriod(currentMonth())
        setBaseSalary("")
        setAttendance("0")
        setTransport("0")
        setIssueDate(today)
        setNotes("")
        setPaid(false)
        setMethodId("")
        setPayDate(today)
      }
      setError(null)
      fetchPaymentMethods().then(setPaymentMethods).catch(() => {})
    }
  }, [open])

  const total = (
    Number(baseSalary || 0) +
    Number(attendance || 0) +
    Number(transport || 0)
  )

  function fmt(n: number) {
    return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  async function handleSubmit() {
    if (!employeeId.trim()) { setError("Ingresá el legajo / nombre del empleado."); return }
    if (!baseSalary || Number(baseSalary) <= 0) { setError("Ingresá el sueldo base."); return }
    if (total <= 0) { setError("El total del sueldo debe ser mayor a cero."); return }
    if (paid && !methodId) { setError("Elegí el método de pago."); return }

    setLoading(true)
    setError(null)
    try {
      const outflowData = {
        fecha_emision: issueDate,
        importe: total,
        observaciones: notes.trim() || undefined,
        // null (no undefined) para poder "despagar" al editar: limpia la columna
        fecha_pago: paid ? payDate : null,
        metodo_pago_id: paid ? methodId : null
      }
      const detail = {
        legajo: employeeId.trim(),
        periodo: `${period}-01`,
        sueldo_base: Number(baseSalary),
        presentismo: Number(attendance),
        horas_extra: 0,
        pasaje: Number(transport),
        bono: 0
      }
      if (isEdit && outflow) {
        await updateSalaryExpense(outflow.id, outflowData, detail)
      } else {
        await createSalaryExpense(outflowData, detail)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar el sueldo.")
    } finally {
      setLoading(false)
    }
  }

  const amountField = (label: string, value: string, setter: (v: string) => void) => (
    <TextField
      label={label}
      value={value}
      onChange={(e) => setter(e.target.value)}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
        htmlInput: { inputMode: "numeric" }
      }}
      fullWidth
    />
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar sueldo" : "Registrar sueldo"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Legajo / Empleado" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} fullWidth />
            <TextField
              label="Período"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Box>

          <TextField
            label="Fecha de emisión"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <Divider><Typography variant="caption" color="text.secondary">Desglose del sueldo</Typography></Divider>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {amountField("Sueldo base", baseSalary, setBaseSalary)}
            {amountField("Presentismo", attendance, setAttendance)}
            {amountField("Pasaje", transport, setTransport)}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, bgcolor: "action.hover", borderRadius: 1, px: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">Total:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: total > 0 ? "success.main" : "error.main" }}>
              {fmt(total)}
            </Typography>
          </Box>

          <Divider><Typography variant="caption" color="text.secondary">Pago</Typography></Divider>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <FormControlLabel
              control={<Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} color="success" />}
              label="Ya está pagado"
            />
            {paid && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, flex: 1, minWidth: 260 }}>
                <TextField
                  select
                  size="small"
                  label="Método de pago"
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
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
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Box>
            )}
          </Box>

          <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} fullWidth />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : isEdit ? "Guardar cambios" : "Registrar sueldo"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
