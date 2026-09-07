import { useCallback, useEffect, useRef, useState } from "react"

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"

import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import AddIcon from "@mui/icons-material/Add"
import AssignmentIcon from "@mui/icons-material/Assignment"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import BusinessIcon from "@mui/icons-material/Business"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import PaymentsIcon from "@mui/icons-material/Payments"
import ReceiptIcon from "@mui/icons-material/Receipt"
import TrendingDownIcon from "@mui/icons-material/TrendingDown"

import type { Outflow, OutflowType } from "../types/outflow"
import { partnerLabel } from "../constants/partners"
import type { ExtractedInvoice } from "../types/invoice"
import type { ExtractedSalary } from "../types/salary"
import { fetchOutflows, deleteOutflow } from "../services/outflows"
import { extractInvoices, extractSalaries } from "../services/n8n"
import AddPurchaseModal from "../components/AddPurchaseModal"
import AddSalaryModal from "../components/AddSalaryModal"
import AddTaxModal from "../components/AddTaxModal"
import AddWithdrawalModal from "../components/AddWithdrawalModal"
import MarkExpensePaidModal from "../components/MarkExpensePaidModal"
import ImportInvoicesModal from "../components/ImportInvoicesModal"
import ImportSalariesModal from "../components/ImportSalariesModal"

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR")
}

const TYPE_LABELS: Record<OutflowType, string> = {
  GASTO: "Gasto",
  SUELDO: "Sueldo",
  IMPUESTO: "Impuesto",
  RETIRO: "Retiro"
}

const TYPE_COLORS: Record<OutflowType, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  GASTO: "primary",
  SUELDO: "success",
  IMPUESTO: "warning",
  RETIRO: "error"
}

function getDescription(outflow: Outflow): string {
  if (outflow.gastos) return outflow.gastos.concepto
  if (outflow.sueldos) return `Sueldo — ${outflow.sueldos.legajo}`
  if (outflow.impuestos) return outflow.impuestos.concepto
  if (outflow.retiros) return `Retiro — ${partnerLabel(outflow.retiros.socio_id)}`
  return "—"
}

function getSupplierOrRef(outflow: Outflow): string {
  if (outflow.gastos?.proveedores?.nombre) return outflow.gastos.proveedores.nombre
  if (outflow.gastos?.rubros?.nombre) return outflow.gastos.rubros.nombre
  if (outflow.sueldos) return `Período ${formatDate(outflow.sueldos.periodo)}`
  if (outflow.retiros) return `Origen: ${outflow.retiros.origen}`
  return "—"
}

export default function ExpensesPage() {
  const [outflows, setOutflows] = useState<Outflow[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [activeTab, setActiveTab] = useState<OutflowType | "ALL">("ALL")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [openPurchase, setOpenPurchase] = useState(false)
  const [openSalary, setOpenSalary] = useState(false)
  const [openTax, setOpenTax] = useState(false)
  const [openWithdrawal, setOpenWithdrawal] = useState(false)
  const [openMarkPaid, setOpenMarkPaid] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openEditPurchase, setOpenEditPurchase] = useState(false)
  const [openEditSalary, setOpenEditSalary] = useState(false)
  const [openEditTax, setOpenEditTax] = useState(false)
  const [openEditWithdrawal, setOpenEditWithdrawal] = useState(false)
  const [selected, setSelected] = useState<Outflow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Importación de facturas (OCR/IA vía n8n)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedInvoice[]>([])
  const [openImportReview, setOpenImportReview] = useState(false)

  // Importación de recibos de sueldo (texto PDF vía n8n)
  const [importingSalaries, setImportingSalaries] = useState(false)
  const [extractedSalaries, setExtractedSalaries] = useState<ExtractedSalary[]>([])
  const [openSalaryReview, setOpenSalaryReview] = useState(false)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined)
  const tableRef = useRef<HTMLDivElement>(null)

  // Cantidad de filas según viewport, alto de fila DINÁMICO para que llene todo
  // el espacio sin recortar. Clave: mido el alto NATURAL de la fila más alta
  // (algunas tienen 2 líneas) para no pedir más filas de las que entran — el
  // `height` de un <tr> es un mínimo, así que nunca se comprime por debajo.
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
    const raf = requestAnimationFrame(recalcRows)
    const ro = new ResizeObserver(recalcRows)
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [recalcRows])

  // Recalcular cuando termina de cargar o cambia el filtro
  useEffect(() => { if (!loading) recalcRows() }, [loading, activeTab, recalcRows])

  async function fetchData() {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await fetchOutflows(month)
      setOutflows(data)
    } catch {
      setFetchError("No se pudo cargar la lista de egresos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [month])

  const visible = outflows.filter(o => activeTab === "ALL" || o.tipo === activeTab)
  const visiblePage = visible.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const totalMonth = outflows.reduce((acc, o) => acc + Number(o.importe), 0)
  const pending = outflows.filter(o => !o.fecha_pago).reduce((acc, o) => acc + Number(o.importe), 0)
  const paid = outflows.filter(o => !!o.fecha_pago).reduce((acc, o) => acc + Number(o.importe), 0)

  function openMenu(e: React.MouseEvent<HTMLElement>) { setMenuAnchor(e.currentTarget) }
  function closeMenu() { setMenuAnchor(null) }

  function handleRegister(type: "purchase" | "salary" | "tax" | "withdrawal") {
    closeMenu()
    if (type === "purchase") setOpenPurchase(true)
    else if (type === "salary") setOpenSalary(true)
    else if (type === "tax") setOpenTax(true)
    else setOpenWithdrawal(true)
  }

  function handleEdit(o: Outflow) {
    setSelected(o)
    if (o.tipo === "GASTO") setOpenEditPurchase(true)
    else if (o.tipo === "SUELDO") setOpenEditSalary(true)
    else if (o.tipo === "IMPUESTO") setOpenEditTax(true)
    else if (o.tipo === "RETIRO") setOpenEditWithdrawal(true)
  }

  async function handleImportFacturas(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = "" // permite volver a subir el mismo archivo
    if (files.length === 0) return

    setImporting(true)
    setImportError(null)
    try {
      const invoices = await extractInvoices(files)
      if (invoices.length === 0) {
        setImportError("No se detectaron facturas en los archivos subidos.")
      } else {
        setExtracted(invoices)
        setOpenImportReview(true)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "No se pudieron procesar las facturas.")
    } finally {
      setImporting(false)
    }
  }

  async function handleImportSueldos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return

    setImportingSalaries(true)
    setImportError(null)
    try {
      const sueldos = await extractSalaries(files)
      if (sueldos.length === 0) {
        setImportError("No se detectaron recibos en los archivos subidos.")
      } else {
        setExtractedSalaries(sueldos)
        setOpenSalaryReview(true)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "No se pudieron procesar los recibos.")
    } finally {
      setImportingSalaries(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteOutflow(selected.id, selected.tipo)
      setOpenDeleteDialog(false)
      setSelected(null)
      await fetchData()
    } finally {
      setDeleting(false)
    }
  }

  const tabs: { value: OutflowType | "ALL"; label: string }[] = [
    { value: "ALL", label: "Todos" },
    { value: "GASTO", label: "Gastos" },
    { value: "SUELDO", label: "Sueldos" },
    { value: "IMPUESTO", label: "Impuestos" },
    { value: "RETIRO" as OutflowType, label: "Retiros" }
  ]

  return (
    <Box sx={{ p: 2, flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Egresos</Typography>
          <Typography variant="body2" color="text.secondary">Gastos, sueldos, impuestos y retiros</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="Mes"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 160 }}
          />
          <Button
            variant="outlined"
            component="label"
            disabled={importingSalaries}
            startIcon={importingSalaries ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          >
            {importingSalaries ? "Procesando..." : "Importar sueldos"}
            <input hidden multiple type="file" accept=".pdf" onChange={handleImportSueldos} />
          </Button>
          <Button
            variant="outlined"
            component="label"
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          >
            {importing ? "Procesando..." : "Importar facturas"}
            <input
              hidden
              multiple
              type="file"
              accept=".pdf,.xml,.png,.jpg,.jpeg"
              onChange={handleImportFacturas}
            />
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            onClick={openMenu}
          >
            Nuevo egreso
          </Button>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
            <MenuItem onClick={() => handleRegister("purchase")}>
              <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
              Gasto (proveedor)
            </MenuItem>
            <MenuItem onClick={() => handleRegister("salary")}>
              <ListItemIcon><PaymentsIcon fontSize="small" /></ListItemIcon>
              Sueldo
            </MenuItem>
            <MenuItem onClick={() => handleRegister("tax")}>
              <ListItemIcon><ReceiptIcon fontSize="small" /></ListItemIcon>
              Impuesto
            </MenuItem>
            <MenuItem onClick={() => handleRegister("withdrawal")}>
              <ListItemIcon><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
              Retiro de socio
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 2 }}>
        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main" }}><TrendingDownIcon /></Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{fmt(totalMonth)}</Typography>
              <Typography variant="body2" color="text.secondary">Total del mes</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "error.main" }}><AssignmentIcon /></Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: pending > 0 ? "error.main" : "inherit" }}>
                {fmt(pending)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pendiente de pago</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: "success.main" }}><CheckCircleIcon /></Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>{fmt(paid)}</Typography>
              <Typography variant="body2" color="text.secondary">Pagado</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {fetchError && <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>}

      {/* Filter tabs */}
      <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setPage(0) }} sx={{ mb: 1 }}>
        {tabs.map(t => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      {/* Table */}
      <Paper ref={tableRef} sx={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TableContainer sx={{ flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
          <Table stickyHeader>
            <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Referencia</TableCell>
              <TableCell>Emisión</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Importe</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  Cargando...
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  Sin egresos registrados para este período
                </TableCell>
              </TableRow>
            ) : (
              <>
              {visiblePage.map((o) => {
                const isPaid = !!o.fecha_pago
                const isOverdue = !isPaid && o.fecha_vencimiento && o.fecha_vencimiento < new Date().toISOString().split("T")[0]
                return (
                  <TableRow key={o.id} hover sx={{ height: rowHeight }}>
                    <TableCell>
                      <Chip label={TYPE_LABELS[o.tipo]} color={TYPE_COLORS[o.tipo]} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                          {getDescription(o)}
                        </Typography>
                        {o.comprobante && (
                          <Typography variant="caption" color="text.secondary" noWrap>N° {o.comprobante}</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                      {getSupplierOrRef(o)}
                    </TableCell>
                    <TableCell>{formatDate(o.fecha_emision)}</TableCell>
                    <TableCell sx={{ color: isOverdue ? "error.main" : "inherit" }}>
                      {formatDate(o.fecha_vencimiento)}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Chip label={`Pagado ${formatDate(o.fecha_pago)}`} color="success" size="small" />
                      ) : (
                        <Chip
                          label={isOverdue ? "Vencido" : "Pendiente"}
                          color={isOverdue ? "error" : "default"}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700 }}>{fmt(Number(o.importe))}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                        {!isPaid && o.tipo !== "RETIRO" && (
                          <Tooltip title="Marcar como pagado">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => { setSelected(o); setOpenMarkPaid(true) }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(o)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => { setSelected(o); setOpenDeleteDialog(true) }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* relleno: filas vacías para mantener el alto del cuerpo */}
              {Array.from({ length: Math.max(0, rowsPerPage - visiblePage.length) }).map((_, i) => (
                <TableRow key={`empty-${i}`} sx={{ height: rowHeight, "&:hover": { backgroundColor: "transparent" } }}>
                  <TableCell colSpan={8} sx={{ border: 0 }} />
                </TableRow>
              ))}
              </>
            )}
          </TableBody>
        </Table>
        </TableContainer>
        <Divider sx={{ flexShrink: 0 }} />
        <TablePagination
          component="div"
          count={visible.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, overflow: "hidden" }}
        />
      </Paper>

      {/* Modals — alta */}
      <AddPurchaseModal open={openPurchase} onClose={() => setOpenPurchase(false)} onSaved={fetchData} />
      <AddSalaryModal open={openSalary} onClose={() => setOpenSalary(false)} onSaved={fetchData} />
      <AddTaxModal open={openTax} onClose={() => setOpenTax(false)} onSaved={fetchData} />
      <AddWithdrawalModal open={openWithdrawal} onClose={() => setOpenWithdrawal(false)} onSaved={fetchData} />

      {/* Modals — edición */}
      <AddPurchaseModal
        open={openEditPurchase}
        onClose={() => { setOpenEditPurchase(false); setSelected(null) }}
        onSaved={fetchData}
        outflow={selected}
      />
      <AddSalaryModal
        open={openEditSalary}
        onClose={() => { setOpenEditSalary(false); setSelected(null) }}
        onSaved={fetchData}
        outflow={selected}
      />
      <AddTaxModal
        open={openEditTax}
        onClose={() => { setOpenEditTax(false); setSelected(null) }}
        onSaved={fetchData}
        outflow={selected}
      />
      <AddWithdrawalModal
        open={openEditWithdrawal}
        onClose={() => { setOpenEditWithdrawal(false); setSelected(null) }}
        onSaved={fetchData}
        outflow={selected}
      />
      <MarkExpensePaidModal
        open={openMarkPaid}
        onClose={() => { setOpenMarkPaid(false); setSelected(null) }}
        outflow={selected}
        onSaved={fetchData}
      />

      {/* Delete confirmation */}
      <Dialog open={openDeleteDialog} onClose={() => !deleting && setOpenDeleteDialog(false)}>
        <DialogTitle>Eliminar egreso</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography>
              ¿Seguro que querés eliminar <strong>{selected && getDescription(selected)}</strong>?
            </Typography>
            {selected?.fecha_pago && (
              <Alert severity="warning">
                Este egreso ya tiene un pago registrado el {formatDate(selected.fecha_pago)}.
                Al eliminarlo se borrará también el registro de pago.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={deleting}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Eliminando..." : "Eliminar igualmente"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revisión de facturas importadas (OCR n8n) */}
      <ImportInvoicesModal
        open={openImportReview}
        invoices={extracted}
        onClose={() => setOpenImportReview(false)}
        onSaved={fetchData}
      />

      {/* Revisión de recibos de sueldo importados (texto PDF n8n) */}
      <ImportSalariesModal
        open={openSalaryReview}
        salaries={extractedSalaries}
        onClose={() => setOpenSalaryReview(false)}
        onSaved={fetchData}
      />

      {/* Error de importación */}
      <Snackbar
        open={!!importError}
        autoHideDuration={6000}
        onClose={() => setImportError(null)}
      >
        <Alert severity="error" onClose={() => setImportError(null)} variant="filled">
          {importError}
        </Alert>
      </Snackbar>
    </Box>
  )
}
