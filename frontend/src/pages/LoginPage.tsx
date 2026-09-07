import { useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
  Alert,
  CircularProgress
} from "@mui/material"

import BrandMark from "../components/BrandMark"
import { DEMO_MODE } from "../config"
import { USERS } from "../demo/dataset"
import { useAuth } from "../context/AuthContext"

export default function LoginPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { signIn, requestPasswordReset } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleForgotPassword() {
    if (!email.trim()) {
      setInfo(null)
      setError("Ingresá tu email arriba para enviarte el mail de recuperación.")
      return
    }
    setError(null)
    setInfo(null)
    setLoading(true)
    const { error } = await requestPasswordReset(email.trim())
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    setInfo("Te enviamos un mail para recuperar tu contraseña. Revisá tu casilla.")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email.trim(), password)

    if (error) {
      setError("Email o contraseña incorrectos.")
      setLoading(false)
      return
    }

    navigate("/pacientes")
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          linear-gradient(
            135deg,
            ${theme.palette.primary.dark} 0%,
            ${theme.palette.primary.main} 50%,
            ${alpha(theme.palette.secondary.main, 0.9)} 100%
          )
        `
      }}
    >
      {/* Background shapes */}
      <Box
        sx={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: alpha("#fff", 0.06),
          top: -120,
          left: -120,
          filter: "blur(10px)"
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: alpha(theme.palette.common.white, 0.05),
          bottom: -80,
          right: -80,
          filter: "blur(10px)"
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      <Container maxWidth="lg">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              maxWidth: 450,
              p: { xs: 4, md: 5 },
              borderRadius: 6,
              backdropFilter: "blur(18px)",
              background: alpha(theme.palette.background.paper, 0.12),
              border: `1px solid ${alpha("#fff", 0.12)}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)"
            }}
          >
            <Stack spacing={4} component="form" onSubmit={handleSubmit}>
              {/* Logo */}
              <Stack spacing={2} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: alpha("#fff", 0.12),
                    border: `1px solid ${alpha("#fff", 0.15)}`
                  }}
                >
                  <Box sx={{ color: "white", display: "flex" }}>
                    <BrandMark size={40} />
                  </Box>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }} color="white">
                    Residencia
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: alpha("#fff", 0.7) }}>
                    Sistema de gestión administrativa
                  </Typography>
                </Box>
              </Stack>

              {/* Form */}
              <Stack spacing={2.5}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {info && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    {info}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  variant="outlined"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  slotProps={{
                    inputLabel: { sx: { color: alpha("#fff", 0.7) } }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      borderRadius: 3,
                      background: alpha("#fff", 0.04),
                      "& fieldset": { borderColor: alpha("#fff", 0.15) },
                      "&:hover fieldset": { borderColor: alpha("#fff", 0.3) },
                      "&.Mui-focused fieldset": { borderColor: theme.palette.primary.light }
                    },
                    // Chrome autofill: evitar el fondo blanco y mantener texto/label legibles
                    "& input:-webkit-autofill, & input:-webkit-autofill:focus": {
                      WebkitTextFillColor: "#fff",
                      caretColor: "#fff",
                      borderRadius: "inherit",
                      transition: "background-color 9999s ease-in-out 0s"
                    }
                  }}
                />

                <TextField
                  fullWidth
                  type="password"
                  label="Contraseña"
                  variant="outlined"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  slotProps={{
                    inputLabel: { sx: { color: alpha("#fff", 0.7) } }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "white",
                      borderRadius: 3,
                      background: alpha("#fff", 0.04),
                      "& fieldset": { borderColor: alpha("#fff", 0.15) },
                      "&:hover fieldset": { borderColor: alpha("#fff", 0.3) },
                      "&.Mui-focused fieldset": { borderColor: theme.palette.primary.light }
                    },
                    // Chrome autofill: evitar el fondo blanco y mantener texto/label legibles
                    "& input:-webkit-autofill, & input:-webkit-autofill:focus": {
                      WebkitTextFillColor: "#fff",
                      caretColor: "#fff",
                      borderRadius: "inherit",
                      transition: "background-color 9999s ease-in-out 0s"
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
                    mt: 1,
                    py: 1.5,
                    borderRadius: 3,
                    fontWeight: 700,
                    fontSize: "1rem",
                    background: alpha("#fff", 0.12),
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${alpha("#fff", 0.12)}`,
                    "&:hover": { background: alpha("#fff", 0.2) }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Ingresar"}
                </Button>

                <Button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  sx={{
                    alignSelf: "center",
                    textTransform: "none",
                    color: alpha("#fff", 0.75),
                    "&:hover": { color: "#fff", background: "transparent" }
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Button>

                {/* En la demo pública no hay nada que proteger: las credenciales
                    se muestran para que cualquiera pueda entrar y recorrerla. */}
                {DEMO_MODE && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      borderRadius: 3,
                      background: alpha("#fff", 0.08),
                      border: `1px solid ${alpha("#fff", 0.12)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ display: "block", fontWeight: 700, color: "#fff", mb: 1 }}
                    >
                      Demo — datos ficticios
                    </Typography>
                    {USERS.map((u) => (
                      <Typography
                        key={u.id}
                        variant="caption"
                        sx={{ display: "block", color: alpha("#fff", 0.8), lineHeight: 1.8 }}
                      >
                        {u.rol === "socio" ? "Socio" : "Administrativo"}:{" "}
                        <strong>{u.email}</strong> / <strong>{u.password}</strong>
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}
