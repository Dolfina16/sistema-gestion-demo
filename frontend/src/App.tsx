import { BrowserRouter, Routes, Route } from "react-router-dom"

import { AuthProvider, useAuth } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import MainLayout from "./layouts/MainLayout"

import LoginPage from "./pages/LoginPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import GuestsPage from "./pages/GuestsPage"
import BillingPage from "./pages/BillingPage"
import ExpensesPage from "./pages/ExpensesPage"
import CashboxPage from "./pages/CashBoxPage"

function AppRoutes() {
  const { recovery } = useAuth()

  // Si el usuario entró por un link de recuperación, mostrar el seteo de nueva
  // contraseña por encima de cualquier ruta (aunque haya sesión de recuperación).
  if (recovery) return <ResetPasswordPage />

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/pacientes" element={<GuestsPage />} />
          <Route path="/facturacion" element={<BillingPage />} />
          <Route path="/egresos" element={<ExpensesPage />} />
          <Route path="/caja" element={<CashboxPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
