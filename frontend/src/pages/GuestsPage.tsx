import { useCallback, useEffect, useRef, useState } from "react"

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material"

import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import AddIcon from "@mui/icons-material/Add"
import BlockIcon from "@mui/icons-material/Block"
import EditIcon from "@mui/icons-material/Edit"
import GroupIcon from "@mui/icons-material/Group"
import PaymentsIcon from "@mui/icons-material/Payments"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import type { Guest, GuestInsert } from "../types/guest"
import type { GuestBalance } from "../types/balance"
import { fetchGuests, createGuest, updateGuest, deactivateGuest } from "../services/guests"
import { fetchAllBalances } from "../services/balances"
import GuestFormModal from "../components/GuestFormModal"
import GuestBalanceModal from "../components/GuestBalanceModal"
import DebtorsModal from "../components/DebtorsModal"

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [allBalances, setAllBalances] = useState<GuestBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDeactivate, setOpenDeactivate] = useState(false)
  const [openBalance, setOpenBalance] = useState(false)
  const [openDebtors, setOpenDebtors] = useState(false)
  const [selected, setSelected] = useState<Guest | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined)
  const tableRef = useRef<HTMLDivElement>(null)

  // Cantidad de filas según viewport, alto de fila DINÁMICO para que llene todo
  // el espacio sin recortar. Clave: mido el alto NATURAL de la fila más alta
  // para no pedir más filas de las que entran — el `height` de un <tr> es un
  // mínimo, así que nunca se comprime por debajo de su contenido.
  const recalcRows = useCallback(() => {
    const el = tableRef.current
    if (!el) return
    const headerH = el.querySelector("thead")?.getBoundingClientRect().height ?? 40
    const pagerH = el.querySelector(".MuiTablePagination-root")?.getBoundingClientRect().height ?? 54
    const dataRows = [...el.querySelectorAll<HTMLElement>("tbody tr")]
      .filter((r) => r.querySelectorAll("td").length > 1) // ignorar placeholder/relleno
    // medir alto NATURAL quitando temporalmente el height forzado (síncrono)
    let natural = 0
    const saved = dataRows.map((r) => r.style.height)
    dataRows.forEach((r) => { r.style.height = "auto" })
    dataRows.forEach((r) => { natural = Math.max(natural, r.getBoundingClientRect().height) })
    dataRows.forEach((r, i) => { r.style.height = saved[i] })
    if (natural === 0) natural = 56 // fallback mientras carga
    const avail = el.clientHeight - headerH - pagerH
    const rows = Math.max(1, Math.floor(avail / natural))
    setRowsPerPage(rows)
    setRowHeight(Math.floor(avail / rows))
  }, [])

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    // recalcular tras el primer paint (clientHeight estable)
    const raf = requestAnimationFrame(recalcRows)
    const ro = new ResizeObserver(recalcRows)
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [recalcRows])

  // Recalcular cuando termina de cargar (por si el thead/pagination cambian de alto)
  useEffect(() => { if (!loading) recalcRows() }, [loading, recalcRows])

  async function fetchData() {
    setLoading(true)
    setFetchError(null)
    try {
      const [guestList, balanceList] = await Promise.all([
        fetchGuests(true),
        fetchAllBalances()
      ])
      setGuests(guestList)
      setAllBalances(balanceList)
    } catch {
      setFetchError("No se pudo cargar la lista de huéspedes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Includes inactive guests who still have outstanding debt
  const debtorCount = allBalances.filter(b => Number(b.saldo) > 0).length
  const totalDebt = allBalances.reduce((sum, b) => sum + Math.max(Number(b.saldo), 0), 0)

  async function handleCreate(data: GuestInsert) {
    await createGuest(data)
    setSuccessMessage("Huésped agregado correctamente.")
    await fetchData()
  }

  async function handleEdit(data: GuestInsert) {
    if (!selected) return
    await updateGuest(selected.id, data)
    setSuccessMessage("Huésped actualizado.")
    await fetchData()
  }

  async function handleDeactivate() {
    if (!selected) return
    setDeactivating(true)
    try {
      await deactivateGuest(selected.id)
      setSuccessMessage(`${selected.nombre} ${selected.apellido} dado de baja.`)
      setOpenDeactivate(false)
      setSelected(null)
      await fetchData()
    } finally {
      setDeactivating(false)
    }
  }

  function getBalanceForGuest(guestId: string): GuestBalance | undefined {
    return allBalances.find(b => b.huesped_id === guestId)
  }

  return (
    <Box sx={{ p: 2, flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Huéspedes</Typography>
          <Typography variant="body2" color="text.secondary">Gestión de residentes</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}>
          Agregar huésped
        </Button>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 2 }}>
        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main" }}><GroupIcon /></Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{guests.length}</Typography>
              <Typography variant="body2" color="text.secondary">Huéspedes activos</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{ cursor: debtorCount > 0 ? "pointer" : "default", "&:hover": debtorCount > 0 ? { boxShadow: 4 } : {} }}
          onClick={() => debtorCount > 0 && setOpenDebtors(true)}
        >
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: debtorCount > 0 ? "error.main" : "success.main" }}>
              <WarningAmberIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: debtorCount > 0 ? "error.main" : "inherit" }}>
                {debtorCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Con deuda{debtorCount > 0 ? " (ver detalle)" : ""}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "info.main" }}><AccountBalanceWalletIcon /></Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{fmt(totalDebt)}</Typography>
              <Typography variant="body2" color="text.secondary">Deuda total pendiente</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Error */}
      {fetchError && <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>}

      {/* Guests table */}
      <Paper ref={tableRef} sx={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
          <Table stickyHeader>
            <TableHead>
            <TableRow>
              <TableCell>Huésped</TableCell>
              <TableCell>Cobertura</TableCell>
              <TableCell>Cuota mensual</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  Cargando...
                </TableCell>
              </TableRow>
            ) : guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  No hay huéspedes activos
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const slice = guests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                const empty = Math.max(0, rowsPerPage - slice.length)
                return <>
                  {slice.map((guest) => {
                    const balance = getBalanceForGuest(guest.id)
                    const owes = balance && Number(balance.saldo) > 0
                    return (
                      <TableRow key={guest.id} hover sx={{ height: rowHeight }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {guest.apellido}, {guest.nombre}
                      </Typography>
                      {guest.contacto && (
                        <Typography variant="caption" color="text.secondary">{guest.contacto}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{guest.cobertura ?? "—"}</TableCell>
                    <TableCell>{guest.cuota_mensual ? fmt(guest.cuota_mensual) : "—"}</TableCell>
                    <TableCell>
                      {balance ? (
                        <Typography sx={{ fontWeight: 600, color: owes ? "error.main" : "success.main" }}>
                          {fmt(Number(balance.saldo))}
                        </Typography>
                      ) : "—"}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                        <Tooltip title="Cuenta corriente">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => { setSelected(guest); setOpenBalance(true) }}
                          >
                            <PaymentsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => { setSelected(guest); setOpenEdit(true) }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Dar de baja">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => { setSelected(guest); setOpenDeactivate(true) }}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* relleno: filas vacías para mantener el alto del cuerpo */}
                  {Array.from({ length: empty }).map((_, i) => (
                    <TableRow key={`empty-${i}`} sx={{ height: rowHeight, "&:hover": { backgroundColor: "transparent" } }}>
                      <TableCell colSpan={5} sx={{ border: 0 }} />
                    </TableRow>
                  ))}
                </>
              })()
            )}
          </TableBody>
        </Table>
        </TableContainer>
        <Divider sx={{ flexShrink: 0 }} />
        <TablePagination
          component="div"
          count={guests.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, overflow: "hidden" }}
        />
      </Paper>

      {/* Add guest modal */}
      <GuestFormModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSave={handleCreate}
      />

      {/* Edit guest modal */}
      <GuestFormModal
        open={openEdit}
        onClose={() => { setOpenEdit(false); setSelected(null) }}
        guest={selected}
        onSave={handleEdit}
      />

      {/* Balance modal */}
      <GuestBalanceModal
        open={openBalance}
        onClose={() => { setOpenBalance(false); setSelected(null) }}
        guest={selected}
        onUpdate={fetchData}
      />

      {/* Debtors modal — includes inactive guests with outstanding debt */}
      <DebtorsModal
        open={openDebtors}
        onClose={() => setOpenDebtors(false)}
        balances={allBalances}
      />

      {/* Deactivate confirmation dialog */}
      <Dialog open={openDeactivate} onClose={() => setOpenDeactivate(false)}>
        <DialogTitle>Dar de baja a {selected?.nombre} {selected?.apellido}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            El huésped pasará a estado inactivo. Sus cargos y deuda pendiente seguirán
            registrados y visibles en el resumen de deudores.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeactivate(false)} disabled={deactivating}>Cancelar</Button>
          <Button onClick={handleDeactivate} color="error" variant="contained" disabled={deactivating}>
            {deactivating ? "Procesando..." : "Dar de baja"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  )
}
