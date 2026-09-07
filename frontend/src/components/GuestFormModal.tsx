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

import type { Guest, GuestInsert } from "../types/guest"

type Props = {
  open: boolean
  onClose: () => void
  guest?: Guest | null
  onSave: (data: GuestInsert) => Promise<void>
}

// Convierte "1.000.000" / "1000000" / "1.234,50" a número (estilo AR). Vacío → null (limpia).
function parseAmount(s: string): number | null {
  const t = s.trim()
  if (t === "") return null
  const normalized = t.replace(/[.\s]/g, "").replace(",", ".")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export default function GuestFormModal({ open, onClose, guest, onSave }: Props) {
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [cuit, setCuit] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [coverage, setCoverage] = useState("")
  const [monthlyFee, setMonthlyFee] = useState("")
  const [exemptAmount, setExemptAmount] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (guest) {
      setName(guest.nombre)
      setSurname(guest.apellido)
      setCuit(guest.cuit ?? "")
      setContactName(guest.contacto_nombre ?? "")
      setContactEmail(guest.contacto_email ?? "")
      setContactPhone(guest.contacto_telefono ?? "")
      setCoverage(guest.cobertura ?? "")
      setMonthlyFee(guest.cuota_mensual?.toString() ?? "")
      setExemptAmount(guest.monto_exento?.toString() ?? "")
      setStartDate(guest.fecha_alta)
      setNotes(guest.observaciones ?? "")
    } else {
      setName("")
      setSurname("")
      setCuit("")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      setCoverage("")
      setMonthlyFee("")
      setExemptAmount("")
      setStartDate(new Date().toISOString().split("T")[0])
      setNotes("")
    }
    setError(null)
  }, [guest, open])

  async function handleSubmit() {
    if (!name.trim() || !surname.trim()) {
      setError("Nombre y apellido son obligatorios.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSave({
        nombre: name.trim(),
        apellido: surname.trim(),
        cuit: cuit.trim() || undefined,
        contacto_nombre: contactName.trim() || undefined,
        contacto_email: contactEmail.trim() || undefined,
        contacto_telefono: contactPhone.trim() || undefined,
        cobertura: coverage.trim() || undefined,
        cuota_mensual: parseAmount(monthlyFee),
        monto_exento: parseAmount(exemptAmount),
        fecha_alta: startDate,
        observaciones: notes.trim() || undefined
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{guest ? "Editar huésped" : "Agregar huésped"}</DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
            <TextField label="Apellido" value={surname} onChange={(e) => setSurname(e.target.value)} required fullWidth />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="CUIT" value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="20-12345678-9" fullWidth />
            <TextField label="Cobertura" value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder="OSDE, PAMI, Particular..." fullWidth />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Nombre del contacto" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Familiar responsable" fullWidth />
            <TextField label="Teléfono del contacto" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="11-1234-5678" fullWidth />
          </Box>

          <TextField label="Email del contacto" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="correo@ejemplo.com" fullWidth />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Cuota mensual"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                htmlInput: { inputMode: "numeric" }
              }}
              fullWidth
            />
            <TextField
              label="Monto obra social"
              value={exemptAmount}
              onChange={(e) => setExemptAmount(e.target.value)}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                htmlInput: { inputMode: "numeric" }
              }}
              helperText="Parte exenta (reintegro)"
              fullWidth
            />
          </Box>

          <TextField
            label="Fecha de alta"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={3} fullWidth />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : guest ? "Guardar cambios" : "Agregar huésped"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
