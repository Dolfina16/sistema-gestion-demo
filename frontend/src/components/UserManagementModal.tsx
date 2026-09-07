import { useEffect, useState } from "react"

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tab,
  Tabs,
  TextField
} from "@mui/material"

import { createUser, listUsers, resetUserPassword, type AppUser } from "../services/users"

type Props = {
  open: boolean
  onClose: () => void
}

export default function UserManagementModal({ open, onClose }: Props) {
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Crear usuario
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rol, setRol] = useState<"socio" | "administrativo">("administrativo")

  // Cambiar contraseña
  const [userId, setUserId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function resetForms() {
    setNombre(""); setEmail(""); setPassword(""); setRol("administrativo")
    setUserId(""); setNewPassword(""); setCurrentPassword("")
    setError(null); setSuccess(null)
  }

  async function loadUsers() {
    setLoadingUsers(true)
    try {
      setUsers(await listUsers())
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los usuarios.")
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (open) {
      setTab(0)
      resetForms()
      loadUsers()
    }
  }, [open])

  async function handleCreate() {
    if (!nombre.trim()) { setError("Ingresá el nombre."); return }
    if (!email.trim()) { setError("Ingresá el email."); return }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    setLoading(true); setError(null); setSuccess(null)
    try {
      await createUser({ nombre, email, password, rol })
      setSuccess(`Usuario ${email.trim()} creado.`)
      setNombre(""); setEmail(""); setPassword(""); setRol("administrativo")
      loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el usuario.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!userId) { setError("Elegí un usuario."); return }
    if (newPassword.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres."); return }
    if (!currentPassword) { setError("Ingresá la contraseña actual del usuario."); return }
    setLoading(true); setError(null); setSuccess(null)
    try {
      await resetUserPassword(userId, newPassword, currentPassword)
      const u = users.find((x) => x.id === userId)
      setSuccess(`Contraseña actualizada${u ? ` para ${u.email}` : ""}.`)
      setNewPassword(""); setCurrentPassword("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Gestión de usuarios</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setError(null); setSuccess(null) }}
        variant="fullWidth"
      >
        <Tab label="Crear usuario" />
        <Tab label="Cambiar contraseña" />
      </Tabs>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          {tab === 0 ? (
            <>
              <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth />
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Mínimo 6 caracteres"
                fullWidth
              />
              <TextField select label="Rol" value={rol} onChange={(e) => setRol(e.target.value as "socio" | "administrativo")} fullWidth>
                <MenuItem value="administrativo">Administrativo</MenuItem>
                <MenuItem value="socio">Socio</MenuItem>
              </TextField>
              <Button variant="contained" onClick={handleCreate} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : "Crear usuario"}
              </Button>
            </>
          ) : (
            <>
              <TextField
                select
                label="Usuario"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loadingUsers}
                helperText={loadingUsers ? "Cargando usuarios…" : undefined}
                fullWidth
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.nombre ? `${u.nombre} — ${u.email}` : u.email}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Mínimo 6 caracteres"
                fullWidth
              />
              <TextField
                label="Contraseña actual del usuario"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                helperText="Por seguridad, hay que conocer la contraseña actual del usuario"
                autoComplete="off"
                fullWidth
              />
              <Button variant="contained" onClick={handleResetPassword} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : "Cambiar contraseña"}
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
