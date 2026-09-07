import { useEffect, useState } from "react"

import {
  Alert,
  Autocomplete,
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
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"

import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined"

import type { Category } from "../types/category"
import type { Supplier } from "../types/supplier"
import type { PaymentMethod } from "../types/paymentMethod"
import type { ExtractedInvoice } from "../types/invoice"
import { fetchCategories } from "../services/categories"
import { fetchSuppliers, findOrCreateSupplier } from "../services/suppliers"
import { fetchPaymentMethods } from "../services/paymentMethods"
import { createPurchaseExpense } from "../services/outflows"

type Props = {
  open: boolean
  invoices: ExtractedInvoice[]
  onClose: () => void
  onSaved: () => void
}

type Row = {
  key: string
  proveedor: string
  rubro_id: string
  concepto: string
  fecha_emision: string
  fecha_vencimiento: string
  importe: string
  comprobante: string
  pagada: boolean
  fecha_pago: string
  metodo_pago_id: string
  archivo?: string
  confianza?: number
  advertencia?: string
  saving: boolean
  error: string | null
}

const today = () => new Date().toISOString().split("T")[0]

function toRow(inv: ExtractedInvoice, i: number): Row {
  return {
    key: `${i}-${inv.archivo ?? inv.comprobante ?? Math.random()}`,
    proveedor: inv.proveedor ?? "",
    rubro_id: "",
    concepto: inv.concepto ?? "",
    fecha_emision: inv.fecha_emision ?? today(),
    fecha_vencimiento: inv.fecha_vencimiento ?? "",
    importe: inv.importe != null ? String(inv.importe) : "",
    comprobante: inv.comprobante ?? "",
    pagada: false,
    fecha_pago: inv.fecha_emision ?? today(),
    metodo_pago_id: "",
    archivo: inv.archivo,
    confianza: inv.confianza,
    advertencia: inv.advertencia,
    saving: false,
    error: null
  }
}

export default function ImportInvoicesModal({ open, invoices, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    if (!open) return
    setRows(invoices.map(toRow))
    setSavedCount(0)
    Promise.all([fetchSuppliers(), fetchCategories(), fetchPaymentMethods()])
      .then(([s, c, m]) => { setSuppliers(s); setCategories(c); setPaymentMethods(m) })
      .catch(() => {})
  }, [open, invoices])

  function patch(key: string, changes: Partial<Row>) {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...changes } : r)))
  }

  function discard(key: string) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  async function confirmRow(row: Row) {
    if (!row.proveedor.trim()) { patch(row.key, { error: "Falta el proveedor." }); return }
    if (!row.rubro_id) { patch(row.key, { error: "Elegí un rubro." }); return }
    if (!row.importe || Number(row.importe) <= 0) { patch(row.key, { error: "Importe inválido." }); return }
    if (row.pagada && !row.metodo_pago_id) { patch(row.key, { error: "Elegí el método de pago." }); return }

    patch(row.key, { saving: true, error: null })
    try {
      const supplier = await findOrCreateSupplier(row.proveedor)
      await createPurchaseExpense(
        {
          fecha_emision: row.fecha_emision,
          fecha_vencimiento: row.fecha_vencimiento || undefined,
          importe: Number(row.importe),
          comprobante: row.comprobante.trim() || undefined,
          // si el empleado la marcó como pagada, registramos el pago junto con el gasto
          fecha_pago: row.pagada ? row.fecha_pago : undefined,
          metodo_pago_id: row.pagada ? row.metodo_pago_id : undefined
        },
        {
          proveedor_id: supplier.id,
          rubro_id: row.rubro_id,
          concepto: row.concepto.trim() || "Factura importada"
        }
      )
      setSavedCount(c => c + 1)
      discard(row.key)
    } catch (e: unknown) {
      patch(row.key, { saving: false, error: e instanceof Error ? e.message : "No se pudo guardar." })
    }
  }

  function handleClose() {
    if (savedCount > 0) onSaved()
    onClose()
  }

  const pending = rows.length

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Revisar facturas importadas
        {pending > 0 && ` · ${pending} pendiente${pending !== 1 ? "s" : ""}`}
      </DialogTitle>
      <DialogContent dividers>
        {pending === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography>
              {savedCount > 0
                ? `Se registraron ${savedCount} gasto${savedCount !== 1 ? "s" : ""}.`
                : "No hay facturas para revisar."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {rows.map((row) => (
              <Card key={row.key} variant="outlined">
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {row.archivo ?? "Factura"}
                      </Typography>
                      {row.confianza != null && (
                        <Chip
                          size="small"
                          label={`IA ${Math.round(row.confianza * 100)}%`}
                          color={row.confianza >= 0.8 ? "success" : "warning"}
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Tooltip title="Descartar">
                      <IconButton size="small" color="error" onClick={() => discard(row.key)} disabled={row.saving}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {row.advertencia && <Alert severity="warning">{row.advertencia}</Alert>}
                  {row.error && <Alert severity="error">{row.error}</Alert>}

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <Autocomplete
                      freeSolo
                      options={suppliers.map(s => s.nombre)}
                      value={row.proveedor}
                      onInputChange={(_, v) => patch(row.key, { proveedor: v })}
                      renderInput={(params) => <TextField {...params} label="Proveedor" fullWidth />}
                    />
                    <TextField
                      select
                      label="Rubro"
                      value={row.rubro_id}
                      onChange={(e) => patch(row.key, { rubro_id: e.target.value })}
                      fullWidth
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <TextField
                    label="Concepto"
                    value={row.concepto}
                    onChange={(e) => patch(row.key, { concepto: e.target.value })}
                    fullWidth
                  />

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2 }}>
                    <TextField
                      label="Emisión"
                      type="date"
                      value={row.fecha_emision}
                      onChange={(e) => patch(row.key, { fecha_emision: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                    />
                    <TextField
                      label="Vencimiento"
                      type="date"
                      value={row.fecha_vencimiento}
                      onChange={(e) => patch(row.key, { fecha_vencimiento: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                    />
                    <TextField
                      label="Importe"
                      value={row.importe}
                      onChange={(e) => patch(row.key, { importe: e.target.value })}
                      slotProps={{
                        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                        htmlInput: { inputMode: "numeric" }
                      }}
                      fullWidth
                    />
                    <TextField
                      label="N° comprobante"
                      value={row.comprobante}
                      onChange={(e) => patch(row.key, { comprobante: e.target.value })}
                      fullWidth
                    />
                  </Box>

                  {/* Pago */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={row.pagada}
                          onChange={(e) => patch(row.key, { pagada: e.target.checked })}
                          color="success"
                        />
                      }
                      label="Ya está pagada"
                    />
                    {row.pagada && (
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, flex: 1, minWidth: 260 }}>
                        <TextField
                          select
                          size="small"
                          label="Método de pago"
                          value={row.metodo_pago_id}
                          onChange={(e) => patch(row.key, { metodo_pago_id: e.target.value })}
                          fullWidth
                        >
                          {paymentMethods.map((m) => (
                            <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="Fecha de pago"
                          type="date"
                          value={row.fecha_pago}
                          onChange={(e) => patch(row.key, { fecha_pago: e.target.value })}
                          slotProps={{ inputLabel: { shrink: true } }}
                          fullWidth
                        />
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      onClick={() => confirmRow(row)}
                      disabled={row.saving}
                    >
                      {row.saving ? <CircularProgress size={20} color="inherit" /> : "Confirmar gasto"}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>
          {pending === 0 ? "Cerrar" : "Terminar"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
