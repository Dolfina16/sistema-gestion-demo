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
  MenuItem,
  TextField
} from "@mui/material"

import type { Outflow } from "../types/outflow"
import type { PaymentMethod } from "../types/paymentMethod"
import { fetchPaymentMethods } from "../services/paymentMethods"
import { markAsPaid } from "../services/outflows"

type Props = {
  open: boolean
  onClose: () => void
  outflow: Outflow | null
  onSaved: () => void
}

export default function MarkExpensePaidModal({ open, onClose, outflow, onSaved }: Props) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethodId, setPaymentMethodId] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchPaymentMethods().then(setPaymentMethods).catch(() => {})
      setPaymentDate(new Date().toISOString().split("T")[0])
      setPaymentMethodId("")
      setError(null)
    }
  }, [open])

  async function handleSubmit() {
    if (!outflow) return
    if (!paymentMethodId) { setError("Seleccioná un método de pago."); return }

    setLoading(true)
    setError(null)
    try {
      await markAsPaid(outflow.id, paymentDate, paymentMethodId)
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
      <DialogTitle>Marcar como pagado</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Fecha de pago"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <TextField
            select
            label="Método de pago"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            fullWidth
          >
            {paymentMethods.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" color="success" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Confirmar pago"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
