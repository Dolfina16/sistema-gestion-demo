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
  InputAdornment,
  MenuItem,
  TextField
} from "@mui/material"

import type { Outflow } from "../types/outflow"
import { PARTNER_NAMES } from "../constants/partners"
import { createWithdrawal, updateWithdrawal } from "../services/outflows"
import { fetchPaymentMethods } from "../services/paymentMethods"
import type { PaymentMethod } from "../types/paymentMethod"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  outflow?: Outflow | null
}

const PARTNERS: { id: 1 | 2; label: string }[] = [
  { id: 1, label: PARTNER_NAMES[1] },
  { id: 2, label: PARTNER_NAMES[2] }
]

export default function AddWithdrawalModal({ open, onClose, onSaved, outflow }: Props) {
  const isEdit = !!outflow

  const [partnerId, setPartnerId] = useState<1 | 2>(1)
  const [metodoPagoId, setMetodoPagoId] = useState("")
  const [amount, setAmount] = useState("")
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      if (isEdit && outflow) {
        setPartnerId((outflow.retiros?.socio_id ?? 1) as 1 | 2)
        setMetodoPagoId(outflow.metodo_pago_id ?? paymentMethods[0]?.id ?? "")
        setAmount(String(outflow.importe))
        setWithdrawalDate(outflow.fecha_emision)
        setNotes(outflow.observaciones ?? "")
      } else {
        setPartnerId(1)
        setMetodoPagoId(paymentMethods[0]?.id ?? "")
        setAmount("")
        setWithdrawalDate(new Date().toISOString().split("T")[0])
        setNotes("")
      }
      setError(null)
    }
  }, [open, paymentMethods])

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError("Ingresá un importe válido."); return }
    if (!metodoPagoId) { setError("Seleccioná el origen del dinero."); return }

    const selectedMethod = paymentMethods.find(m => m.id === metodoPagoId)
    const origenLabel = selectedMethod?.nombre ?? "—"

    setLoading(true)
    setError(null)
    try {
      const outflowData = {
        fecha_emision: withdrawalDate,
        importe: Number(amount),
        metodo_pago_id: metodoPagoId,
        observaciones: notes.trim() || undefined
      }
      const detail = { socio_id: partnerId, origen: origenLabel }
      if (isEdit && outflow) {
        // actualizar también fecha_pago (retiros son inmediatos)
        await updateWithdrawal(outflow.id, { ...outflowData, fecha_pago: withdrawalDate }, detail)
      } else {
        await createWithdrawal({ tipo: "RETIRO", ...outflowData }, detail)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar el retiro.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Editar retiro" : "Retiro de socio"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            select
            label="Socio"
            value={partnerId}
            onChange={(e) => setPartnerId(Number(e.target.value) as 1 | 2)}
            fullWidth
          >
            {PARTNERS.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Fecha"
            type="date"
            value={withdrawalDate}
            onChange={(e) => setWithdrawalDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

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

          <TextField
            select
            label="Origen"
            value={metodoPagoId}
            onChange={(e) => setMetodoPagoId(e.target.value)}
            fullWidth
          >
            {paymentMethods.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Observaciones"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" color="warning" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : isEdit ? "Guardar cambios" : "Registrar retiro"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
