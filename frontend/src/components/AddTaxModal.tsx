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
import { createTaxExpense, updateTaxExpense } from "../services/outflows"
import { fetchPaymentMethods } from "../services/paymentMethods"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  outflow?: Outflow | null
}

export default function AddTaxModal({ open, onClose, onSaved, outflow }: Props) {
  const isEdit = !!outflow

  const [concept, setConcept] = useState("")
  const [amount, setAmount] = useState("")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [receipt, setReceipt] = useState("")
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
      fetchPaymentMethods().then(setPaymentMethods).catch(() => {})
      if (isEdit && outflow) {
        setConcept(outflow.impuestos?.concepto ?? "")
        setAmount(String(outflow.importe))
        setIssueDate(outflow.fecha_emision)
        setDueDate(outflow.fecha_vencimiento ?? "")
        setReceipt(outflow.comprobante ?? "")
        setNotes(outflow.observaciones ?? "")
        setPaid(!!outflow.fecha_pago)
        setMethodId(outflow.metodo_pago_id ?? "")
        setPayDate(outflow.fecha_pago ?? today)
      } else {
        setConcept("")
        setAmount("")
        setIssueDate(today)
        setDueDate("")
        setReceipt("")
        setNotes("")
        setPaid(false)
        setMethodId("")
        setPayDate(today)
      }
      setError(null)
    }
  }, [open])

  async function handleSubmit() {
    if (!concept.trim()) { setError("Ingresá el concepto del impuesto."); return }
    if (!amount || Number(amount) <= 0) { setError("Ingresá un importe válido."); return }
    if (paid && !methodId) { setError("Elegí el método de pago."); return }

    setLoading(true)
    setError(null)
    try {
      const outflowData = {
        fecha_emision: issueDate,
        fecha_vencimiento: dueDate || undefined,
        importe: Number(amount),
        comprobante: receipt.trim() || undefined,
        observaciones: notes.trim() || undefined,
        // null (no undefined) para poder "despagar" al editar: limpia la columna
        fecha_pago: paid ? payDate : null,
        metodo_pago_id: paid ? methodId : null
      }
      const detail = { concepto: concept.trim() }
      if (isEdit && outflow) {
        await updateTaxExpense(outflow.id, outflowData, detail)
      } else {
        await createTaxExpense(outflowData, detail)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar el impuesto.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Editar impuesto" : "Registrar impuesto"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Concepto (ej: IVA, Ingresos Brutos, Monotributo)" value={concept} onChange={(e) => setConcept(e.target.value)} fullWidth />

          <TextField
            label="Importe"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
              htmlInput: { inputMode: "numeric" }
            }}
            fullWidth
          />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Fecha de emisión"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Fecha de vencimiento"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Box>

          <TextField label="N° comprobante" value={receipt} onChange={(e) => setReceipt(e.target.value)} fullWidth />

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
          {loading ? <CircularProgress size={20} /> : isEdit ? "Guardar cambios" : "Registrar impuesto"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
