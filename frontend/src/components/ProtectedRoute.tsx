import { Navigate, Outlet } from "react-router-dom"
import { CircularProgress, Box } from "@mui/material"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
