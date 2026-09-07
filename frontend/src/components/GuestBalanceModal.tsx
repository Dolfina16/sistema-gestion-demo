import { useEffect, useState } from "react"

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material"

import AddCardIcon from "@mui/icons-material/AddCard"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined"
import PaymentsIcon from "@mui/icons-material/Payments"

import type { Guest } from "../types/guest"
import type { Income } from "../types/income"
import type { Payment } from "../types/payment"
import { fetchIncomesByGuest, deleteIncome } from "../services/incomes"
import { fetchPaymentsByGuest, deletePayment } from "../services/payments"
import AddIncomeModal from "./AddIncomeModal"
import RegisterPaymentModal from "./RegisterPaymentModal"

type Props = {
  open: boolean
  onClose: () => void
  guest: Guest | null
  onUpdate?: () => void
}

type PaymentWithMethod = Payment & { metodos_pago?: { nombre: string } }

type Movement = {
  id: string
  date: string
  sortKey: string
  type: "cargo" | "pago"
  description: string
  detail: string
  amount: number
}

type Filter = "todos" | "cargo" | "pago"

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR")
}

function formatPeriod(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
}

function buildMovements(incomes: Income[], payments: PaymentWithMethod[]): Movement[] {
  const items: Movement[] = []

  for (const i of incomes) {
    items.push({
      id: i.id,
      date: i.periodo,
      sortKey: `${i.periodo}_${i.created_at}`,
      type: "cargo",
      description: i.concepto,
      detail: formatPeriod(i.periodo),
      amount: Number(i.importe)
    })
  }

  for (const p of payments) {
    items.push({
      id: p.id,
      date: p.fecha,
      sortKey: `${p.fecha}_${p.created_at}`,
      type: "pago",
      description: p.metodos_pago?.nombre ?? "Pago",
      detail: p.observaciones ?? "",
      amount: Number(p.importe)
    })
  }

  items.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
  return items
}

export default function GuestBalanceModal({ open, onClose, guest, onUpdate }: Props) {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [payments, setPayments] = useState<PaymentWithMethod[]>([])
  const [filter, setFilter] = useState<Filter>("todos")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openAddIncome, setOpenAddIncome] = useState(false)
  const [openRegisterPayment, setOpenRegisterPayment] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Movement | null>(null)

  async function fetchData() {
    if (!guest) return
    setLoading(true)
    setError(null)
    try {
      const [inc, pay] = await Promise.all([
        fetchIncomesByGuest(guest.id),
        fetchPaymentsByGuest(guest.id)
      ])
      setIncomes(inc)
      setPayments(pay as PaymentWithMethod[])
    } catch {
      setError("No se pudo cargar la cuenta corriente.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && guest) {
      setFilter("todos")
      fetchData()
    }
  }, [open, guest])

  async function handleSaved() {
    await fetchData()
    onUpdate?.()
  }

  async function handleDeleteMovement(m: Movement) {
    setDeletingId(m.id)
    try {
      if (m.type === "cargo") await deleteIncome(m.id)
      else await deletePayment(m.id)
      await fetchData()
      onUpdate?.()
      setToDelete(null)
    } catch {
      setError(m.type === "cargo" ? "No se pudo eliminar el cargo." : "No se pudo eliminar el pago.")
    } finally {
      setDeletingId(null)
    }
  }

  if (!guest) return null

  const totalIncomes = incomes.reduce((acc, i) => acc + Number(i.importe), 0)
  const totalPayments = payments.reduce((acc, p) => acc + Number(p.importe), 0)
  const balance = totalIncomes - totalPayments

  const movements = buildMovements(incomes, payments)
  const visible = filter === "todos" ? movements : movements.filter(m => m.type === filter)

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {guest.apellido}, {guest.nombre}
              </Typography>
              {guest.cuit && (
                <Typography variant="body2" color="text.secondary">CUIT: {guest.cuit}</Typography>
              )}
            </Box>
            <Chip
              label={balance > 0 ? `Debe ${fmt(balance)}` : balance < 0 ? `A favor ${fmt(Math.abs(balance))}` : "Al día"}
              color={balance > 0 ? "error" : balance < 0 ? "warning" : "success"}
              sx={{ fontWeight: 700, fontSize: "0.9rem", px: 1 }}
            />
          </Box>
        </DialogTitle>

        <Divider />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", py: 2, px: 3, gap: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Total cargos</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>{fmt(totalIncomes)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Total pagado</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>{fmt(totalPayments)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Saldo</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: balance > 0 ? "error.main" : "success.main" }}>
              {fmt(balance)}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <DialogContent sx={{ p: 0 }}>
          {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                <ToggleButtonGroup
                  value={filter}
                  exclusive
                  onChange={(_, v) => { if (v) setFilter(v) }}
                  size="small"
                >
                  <ToggleButton value="todos">Todos ({movements.length})</ToggleButton>
                  <ToggleButton value="cargo">Cargos ({incomes.length})</ToggleButton>
                  <ToggleButton value="pago">Pagos ({payments.length})</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell align="right">Importe</TableCell>
                    <TableCell width={40} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        Sin movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>{formatDate(m.date)}</TableCell>
                        <TableCell>
                          <Chip
                            label={m.type === "cargo" ? "Cargo" : "Pago"}
                            size="small"
                            color={m.type === "cargo" ? "error" : "success"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{m.description}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{m.detail || "—"}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            color: m.type === "cargo" ? "error.main" : "success.main"
                          }}
                        >
                          {m.type === "cargo" ? "" : "−"}{fmt(m.amount)}
                        </TableCell>
                        <TableCell padding="none">
                          <Tooltip title={m.type === "cargo" ? "Eliminar cargo" : "Eliminar pago"}>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={deletingId === m.id}
                              onClick={() => setToDelete(m)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button startIcon={<AddCardIcon />} onClick={() => setOpenAddIncome(true)}>
            Agregar cargo
          </Button>
          <Button startIcon={<PaymentsIcon />} variant="contained" color="success" onClick={() => setOpenRegisterPayment(true)}>
            Registrar pago
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <AddIncomeModal
        open={openAddIncome}
        onClose={() => setOpenAddIncome(false)}
        guest={guest}
        onSaved={handleSaved}
      />

      <RegisterPaymentModal
        open={openRegisterPayment}
        onClose={() => setOpenRegisterPayment(false)}
        guest={guest}
        onSaved={handleSaved}
      />

      {/* Confirmación de borrado de cargo / pago */}
      <Dialog open={!!toDelete} onClose={() => { if (!deletingId) setToDelete(null) }}>
        <DialogTitle>{toDelete?.type === "pago" ? "Eliminar pago" : "Eliminar cargo"}</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que querés eliminar {toDelete?.type === "pago" ? "el pago" : "el cargo"}{" "}
            <strong>{toDelete?.description}</strong>
            {toDelete ? ` de ${formatPeriod(toDelete.date)}` : ""} por{" "}
            <strong>{toDelete ? fmt(toDelete.amount) : ""}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Esta acción no se puede deshacer y modificará el saldo del huésped.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={!!deletingId}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!!deletingId}
            onClick={() => toDelete && handleDeleteMovement(toDelete)}
          >
            {deletingId ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
