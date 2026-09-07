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

import type { Guest } from "../types/guest"
import type { PaymentMethod } from "../types/paymentMethod"
import { createPayment } from "../services/payments"
import { fetchPaymentMethods } from "../services/paymentMethods"

type Props = {
  open: boolean
  onClose: () => void
  guest: Guest | null
  onSaved: () => void
}

export default function RegisterPaymentModal({ open, onClose, guest, onSaved }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [amount, setAmount] = useState("")
  const [paymentMethodId, setPaymentMethodId] = useState("")
  const [notes, setNotes] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchPaymentMethods().then(setPaymentMethods).catch(() => {})
      setDate(new Date().toISOString().split("T")[0])
      setAmount("")
      setPaymentMethodId("")
      setNotes("")
      setError(null)
    }
  }, [open])

  async function handleSubmit() {
    if (!guest) return
    if (!amount || Number(amount) <= 0) { setError("Ingresá un importe válido."); return }
    if (!paymentMethodId) { setError("Seleccioná un método de pago."); return }
    if (!date) { setError("Seleccioná una fecha."); return }

    setLoading(true)
    setError(null)
    try {
      await createPayment({
        huesped_id: guest.id,
        fecha: date,
        importe: Number(amount),
        metodo_pago_id: paymentMethodId,
        observaciones: notes.trim() || undefined
      })
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Registrar pago — {guest?.apellido}, {guest?.nombre}</DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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

          <TextField select label="Método de pago" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} fullWidth>
            {paymentMethods.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} fullWidth />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Registrar pago"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
