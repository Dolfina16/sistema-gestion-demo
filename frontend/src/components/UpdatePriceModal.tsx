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
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography
} from "@mui/material"

import { updateMonthlyFees } from "../services/billing"
import { triggerPriceIncreaseMail } from "../services/n8n"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (e?: string) => !!e && EMAIL_RE.test(e.trim())

type Props = {
  open: boolean
  onClose: () => void
  guestIds: string[]
  onSaved: (summary: string) => void
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

export default function UpdatePriceModal({ open, onClose, guestIds, onSaved }: Props) {
  const [mode, setMode] = useState<"percentage" | "fixed">("percentage")
  const [value, setValue] = useState("")
  const [notify, setNotify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Resetear el switch al abrir, para no reenviar mails por un estado viejo.
  useEffect(() => { if (open) setNotify(false) }, [open])

  function handleClose() {
    if (loading) return
    setConfirming(false)
    onClose()
  }

  // Paso 1: valida y abre la confirmación (no aplica todavía).
  function handleApply() {
    if (!value || Number(value) <= 0) {
      setError("Ingresá un valor válido.")
      return
    }
    if (guestIds.length === 0) {
      setError("Seleccioná al menos un huésped.")
      return
    }
    setError(null)
    setConfirming(true)
  }

  // Paso 2: aplica de verdad (y, si corresponde, notifica el aumento por mail).
  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const updated = await updateMonthlyFees(guestIds, mode, Number(value))

      // Las cuotas YA se actualizaron. El mail es secundario: si falla, no se
      // revierte nada — se avisa en el resumen.
      let summary = `Cuotas actualizadas (${updated.length}).`
      if (notify) {
        const withEmail = updated.filter(u => isValidEmail(u.contacto_email))
        const withoutEmail = updated.length - withEmail.length
        if (withEmail.length > 0) {
          try {
            await triggerPriceIncreaseMail({
              tipo: "aumento",
              mode,
              value: Number(value),
              guests: withEmail.map(u => ({
                id: u.id,
                nombre: u.nombre,
                apellido: u.apellido,
                contacto: { nombre: u.contacto_nombre, email: u.contacto_email },
                cuotaAnterior: u.cuotaAnterior,
                cuotaNueva: u.cuotaNueva,
              })),
            })
            summary += ` ${withEmail.length} notificado${withEmail.length !== 1 ? "s" : ""} por email.`
          } catch (e: unknown) {
            summary += ` No se pudo notificar por email: ${e instanceof Error ? e.message : "error"}.`
          }
        }
        if (withoutEmail > 0) {
          summary += ` ${withoutEmail} sin email (no notificado${withoutEmail !== 1 ? "s" : ""}).`
        }
      }

      setConfirming(false)
      onSaved(summary)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar cuotas.")
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  const n = guestIds.length
  const plural = n !== 1 ? "es" : ""

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Actualizar cuotas</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600 }}>Tipo de actualización</Typography>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as "percentage" | "fixed")}>
              <FormControlLabel value="percentage" control={<Radio />} label="Porcentaje de aumento" />
              <FormControlLabel value="fixed" control={<Radio />} label="Valor fijo" />
            </RadioGroup>
          </Box>

          <TextField
            label={mode === "percentage" ? "Porcentaje de aumento" : "Nueva cuota"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">{mode === "percentage" ? "%" : "$"}</InputAdornment>
              },
              htmlInput: { inputMode: "numeric" }
            }}
            placeholder={mode === "percentage" ? "ej: 15" : "ej: 350000"}
            fullWidth
          />

          <Divider />

          <Box>
            <FormControlLabel
              control={<Switch checked={notify} onChange={(e) => setNotify(e.target.checked)} color="warning" />}
              label="Notificar el aumento por email"
            />
            {notify && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Se enviará un mail con la nueva cuota y el aumento a los seleccionados que tengan email de contacto.
              </Typography>
            )}
          </Box>

          <Alert severity="info">
            Se aplicará a {n} huésped{plural} seleccionado{plural}.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleApply} disabled={loading}>
          Aplicar
        </Button>
      </DialogActions>

      {/* Confirmación antes de aplicar el cambio de cuotas */}
      <Dialog open={confirming} onClose={() => !loading && setConfirming(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar actualización</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            {mode === "percentage"
              ? `Se aumentará la cuota un ${value}% a ${n} huésped${plural}.`
              : `Se fijará la cuota en ${fmtMoney(Number(value))} para ${n} huésped${plural}.`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción sobrescribe la cuota mensual. ¿Confirmás?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirming(false)} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirm} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
