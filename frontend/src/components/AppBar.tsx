import * as React from "react"
import { Link, useNavigate } from "react-router-dom"

import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Toolbar from "@mui/material/Toolbar"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import Menu from "@mui/material/Menu"
import MenuIcon from "@mui/icons-material/Menu"
import Container from "@mui/material/Container"
import Button from "@mui/material/Button"
import Tooltip from "@mui/material/Tooltip"
import MenuItem from "@mui/material/MenuItem"
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts"

import BrandMark from "./BrandMark"
import { useAuth } from "../context/AuthContext"
import UserManagementModal from "./UserManagementModal"

const pages = [
  { label: "Huéspedes", path: "/pacientes" },
  { label: "Facturación Mensual", path: "/facturacion" },
  { label: "Egresos", path: "/egresos" },
  { label: "Caja", path: "/caja" }
]

function ResponsiveAppBar() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null)
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null)
  const [openUsers, setOpenUsers] = React.useState(false)

  async function handleSignOut() {
    setAnchorElUser(null)
    await signOut()
    navigate("/")
  }

  return (
    <>
    <AppBar position="fixed">
      <Container maxWidth={false}>
        <Toolbar disableGutters sx={{ minHeight: { md: 80 } }}>
          <Box sx={{ display: { xs: "none", md: "flex" }, color: "white" }}>
            <BrandMark size={48} />
          </Box>

          <Typography
            variant="h6"
            noWrap
            sx={{
              ml: 1.5,
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 600,
              letterSpacing: ".12rem",
              color: "inherit",
              textDecoration: "none"
            }}
          >
            Residencia
          </Typography>

          {/* Mobile nav */}
          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="navegación"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={(e) => setAnchorElNav(e.currentTarget)}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              open={Boolean(anchorElNav)}
              onClose={() => setAnchorElNav(null)}
              sx={{ display: { xs: "block", md: "none" } }}
            >
              {pages.map((page) => (
                <MenuItem key={page.label} component={Link} to={page.path} onClick={() => setAnchorElNav(null)}>
                  <Typography sx={{ textAlign: "center" }}>{page.label}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Typography
            variant="h5"
            noWrap
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 600,
              letterSpacing: ".12rem",
              color: "inherit",
              textDecoration: "none"
            }}
          >
            Residencia
          </Typography>

          {/* Desktop nav */}
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: 1 }}>
            {pages.map((page) => (
              <Button
                key={page.label}
                component={Link}
                to={page.path}
                sx={{ my: 2, px: 2.5, py: 1, color: "white", fontSize: "1.25rem", fontWeight: 600, textTransform: "none" }}
              >
                {page.label}
              </Button>
            ))}
          </Box>

          {/* User menu */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title={user?.email ?? "Cuenta"}>
              <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} sx={{ color: "white" }}>
                <ManageAccountsIcon />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "45px" }}
              id="menu-user"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElUser)}
              onClose={() => setAnchorElUser(null)}
            >
              <MenuItem onClick={() => { setAnchorElUser(null); setOpenUsers(true) }}>
                <Typography>Gestionar usuarios</Typography>
              </MenuItem>
              <MenuItem onClick={handleSignOut}>
                <Typography>Cerrar Sesión</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
    <UserManagementModal open={openUsers} onClose={() => setOpenUsers(false)} />
    </>
  )
}

export default ResponsiveAppBar
