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
  TextField
} from "@mui/material"

import type { Guest } from "../types/guest"
import { createIncome } from "../services/incomes"

type Props = {
  open: boolean
  onClose: () => void
  guest: Guest | null
  onSaved: () => void
}

function firstOfMonth(yyyyMM: string): string {
  return `${yyyyMM}-01`
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function AddIncomeModal({ open, onClose, guest, onSaved }: Props) {
  const [period, setPeriod] = useState(currentMonth())
  const [amount, setAmount] = useState("")
  const [concept, setConcept] = useState("Cuota mensual")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPeriod(currentMonth())
      setAmount(guest?.cuota_mensual?.toString() ?? "")
      setConcept("Cuota mensual")
      setNotes("")
      setError(null)
    }
  }, [open, guest])

  async function handleSubmit() {
    if (!guest) return
    if (!amount || Number(amount) <= 0) { setError("Ingresá un importe válido."); return }
    if (!concept.trim()) { setError("El concepto es obligatorio."); return }

    setLoading(true)
    setError(null)
    try {
      await createIncome({
        huesped_id: guest.id,
        periodo: firstOfMonth(period),
        importe: Number(amount),
        concepto: concept.trim(),
        observaciones: notes.trim() || undefined
      })
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrar el cargo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Agregar cargo — {guest?.apellido}, {guest?.nombre}</DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Período"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <TextField label="Concepto" value={concept} onChange={(e) => setConcept(e.target.value)} fullWidth />

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

          <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} fullWidth />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Agregar cargo"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
