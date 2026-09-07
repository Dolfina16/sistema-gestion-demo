import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Table,
  TableBody,
  TableContainer,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material"

import type { GuestBalance } from "../types/balance"

type Props = {
  open: boolean
  onClose: () => void
  balances: GuestBalance[]
}

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
}

export default function DebtorsModal({ open, onClose, balances }: Props) {
  const debtors = [...balances]
    .filter(b => Number(b.saldo) > 0)
    .sort((a, b) => Number(b.saldo) - Number(a.saldo))

  const totalDebt = debtors.reduce((acc, b) => acc + Number(b.saldo), 0)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Huéspedes con deuda</DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Huésped</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Cargos</TableCell>
                <TableCell align="right">Pagado</TableCell>
                <TableCell align="right">Saldo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {debtors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    Ningún huésped tiene deuda
                  </TableCell>
                </TableRow>
              ) : (
                debtors.map((b) => (
                  <TableRow key={b.huesped_id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {b.apellido}, {b.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={b.activo ? "Activo" : "Baja"}
                        size="small"
                        color={b.activo ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                      {fmt(Number(b.total_ingresos))}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "success.main", whiteSpace: "nowrap" }}>
                      {fmt(Number(b.total_pagos))}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {fmt(Number(b.saldo))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {debtors.length > 0 && (
          <>
            <Divider />
            <Box sx={{ display: "flex", justifyContent: "flex-end", px: 3, py: 2, gap: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {debtors.length} huésped{debtors.length !== 1 ? "es" : ""}
              </Typography>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary">Deuda total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
                  {fmt(totalDebt)}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
