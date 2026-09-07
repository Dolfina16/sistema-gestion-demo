import { useEffect, useState } from "react"

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography
} from "@mui/material"

import type { Category } from "../types/category"
import type { Outflow } from "../types/outflow"
import type { PaymentMethod } from "../types/paymentMethod"
import type { Supplier } from "../types/supplier"
import { fetchCategories } from "../services/categories"
import { fetchPaymentMethods } from "../services/paymentMethods"
import { fetchSuppliers, findOrCreateSupplier } from "../services/suppliers"
import { createPurchaseExpense, updatePurchaseExpense } from "../services/outflows"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  outflow?: Outflow | null
}

export default function AddPurchaseModal({ open, onClose, onSaved, outflow }: Props) {
  const isEdit = !!outflow

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [concept, setConcept] = useState("")
  const [amount, setAmount] = useState("")
  const [receipt, setReceipt] = useState("")
  const [notes, setNotes] = useState("")

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pago
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paid, setPaid] = useState(false)
  const [methodId, setMethodId] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0]
      Promise.all([fetchSuppliers(), fetchCategories(), fetchPaymentMethods()])
        .then(([s, c, m]) => { setSuppliers(s); setCategories(c); setPaymentMethods(m) })
        .catch(() => {})
      if (isEdit && outflow) {
        setIssueDate(outflow.fecha_emision)
        setDueDate(outflow.fecha_vencimiento ?? "")
        setSupplierName(outflow.gastos?.proveedores?.nombre ?? "")
        setCategoryId(outflow.gastos?.rubro_id ?? "")
        setConcept(outflow.gastos?.concepto ?? "")
        setAmount(String(outflow.importe))
        setReceipt(outflow.comprobante ?? "")
        setNotes(outflow.observaciones ?? "")
        setPaid(!!outflow.fecha_pago)
        setMethodId(outflow.metodo_pago_id ?? "")
        setPayDate(outflow.fecha_pago ?? today)
      } else {
        setIssueDate(today)
        setDueDate("")
        setSupplierName("")
        setCategoryId("")
        setConcept("")
        setAmount("")
        setReceipt("")
        setNotes("")
        setPaid(false)
        setMethodId("")
        setPayDate(today)
      }
      setError(null)
    }
  }, [open])

  async function handleSubmit() {
    if (!supplierName.trim()) { setError("Ingresá el proveedor."); return }
    if (!categoryId) { setError("Seleccioná un rubro."); return }
    if (!concept.trim()) { setError("Ingresá el concepto."); return }
    if (!amount || Number(amount) <= 0) { setError("Ingresá un importe válido."); return }
    if (paid && !methodId) { setError("Elegí el método de pago."); return }

    setLoading(true)
    setError(null)
    try {
      const supplier = await findOrCreateSupplier(supplierName)
      const outflowData = {
        fecha_emision: issueDate,
        fecha_vencimiento: dueDate || undefined,
        importe: Number(amount),
        comprobante: receipt.trim() || undefined,
        observaciones: notes.trim() || undefined,
        // null (no undefined) para poder "despagar" al editar: limpia la columna
        fecha_pago: paid ? payDate : null,
        metodo_pago_id: paid ? methodId : null
      }
      const detail = {
        proveedor_id: supplier.id,
        rubro_id: categoryId,
        concepto: concept.trim()
      }
      if (isEdit && outflow) {
        await updatePurchaseExpense(outflow.id, outflowData, detail)
      } else {
        await createPurchaseExpense(outflowData, detail)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar el gasto.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar gasto" : "Registrar gasto"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Fecha de emisión"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Fecha de vencimiento"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Box>

          <Autocomplete
            freeSolo
            options={suppliers.map(s => s.nombre)}
            value={supplierName}
            onInputChange={(_, v) => setSupplierName(v)}
            renderInput={(params) => (
              <TextField {...params} label="Proveedor" placeholder="Nombre del proveedor" fullWidth />
            )}
          />

          <TextField select label="Rubro" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField label="Concepto" value={concept} onChange={(e) => setConcept(e.target.value)} fullWidth />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="Importe"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                htmlInput: { inputMode: "numeric" }
              }}
              fullWidth
            />
            <TextField label="N° comprobante" value={receipt} onChange={(e) => setReceipt(e.target.value)} fullWidth />
          </Box>

          <Divider><Typography variant="caption" color="text.secondary">Pago</Typography></Divider>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <FormControlLabel
              control={<Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} color="success" />}
              label="Ya está pagado"
            />
            {paid && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, flex: 1, minWidth: 260 }}>
                <TextField
                  select
                  size="small"
                  label="Método de pago"
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
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
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Box>
            )}
          </Box>

          <TextField label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} fullWidth />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : isEdit ? "Guardar cambios" : "Registrar gasto"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
