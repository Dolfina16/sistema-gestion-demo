import { useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha
} from "@mui/material"

import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded"

import { useAuth } from "../context/AuthContext"

export default function ResetPasswordPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { endRecovery, updatePassword } = useAuth()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return }
    setError(null)
    setLoading(true)
    const { error } = await updatePassword(password)
    if (error) {
      setError(error)
      setLoading(false)
      return
    }
    endRecovery()
    navigate("/pacientes")
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 4, md: 5 },
          borderRadius: 6,
          backdropFilter: "blur(18px)",
          background: alpha(theme.palette.background.paper, 0.12),
          border: `1px solid ${alpha("#fff", 0.12)}`
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
            <LockResetRoundedIcon sx={{ fontSize: 40, color: "white" }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }} color="white">
              Nueva contraseña
            </Typography>
            <Typography variant="body2" sx={{ color: alpha("#fff", 0.7) }}>
              Ingresá tu nueva contraseña para acceder.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            type="password"
            label="Nueva contraseña"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Mínimo 6 caracteres"
            slotProps={{ inputLabel: { sx: { color: alpha("#fff", 0.7) } }, formHelperText: { sx: { color: alpha("#fff", 0.6) } } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "white",
                borderRadius: 3,
                background: alpha("#fff", 0.04),
                "& fieldset": { borderColor: alpha("#fff", 0.15) },
                "&:hover fieldset": { borderColor: alpha("#fff", 0.3) },
                "&.Mui-focused fieldset": { borderColor: theme.palette.primary.light }
              }
            }}
          />

          <TextField
            fullWidth
            type="password"
            label="Repetir contraseña"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            slotProps={{ inputLabel: { sx: { color: alpha("#fff", 0.7) } } }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "white",
                borderRadius: 3,
                background: alpha("#fff", 0.04),
                "& fieldset": { borderColor: alpha("#fff", 0.15) },
                "&:hover fieldset": { borderColor: alpha("#fff", 0.3) },
                "&.Mui-focused fieldset": { borderColor: theme.palette.primary.light }
              }
            }}
          />

          <Button
            fullWidth
            size="large"
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 3,
              fontWeight: 700,
              background: alpha("#fff", 0.12),
              border: `1px solid ${alpha("#fff", 0.12)}`,
              "&:hover": { background: alpha("#fff", 0.2) }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Guardar contraseña"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
