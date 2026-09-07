import { useEffect, useState } from "react"

import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"

import dayjs, { Dayjs } from "dayjs"
import "dayjs/locale/es"

import CustomDateRangePicker from "../components/CustomDatePickerModal"
import CashboxDetailRow from "../components/CashboxDetailRow"
import {
  fetchCashboxAnalysis,
  fetchOpeningBalances,
  findCashMethodId,
  type CashboxAnalysis,
  type CashMovement
} from "../services/cashbox"
import { exportCashboxToExcel } from "../services/cashboxExport"
import { useAuth } from "../context/AuthContext"

dayjs.locale("es")

const POSITIVE = "#4F6F52"
const NEGATIVE = "#8B4B4B"

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

function signedFmt(n: number) {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

// Tarjeta de caja (efectivo o banco) con detalle de movimientos expandible.
function AccountCard({
  title,
  income,
  expenses,
  balance,
  movements
}: {
  title: string
  income: number
  expenses: number
  balance: number
  movements: CashMovement[]
}) {
  const [open, setOpen] = useState(false)
  const hasMovements = movements.length > 0

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Tooltip title={hasMovements ? (open ? "Ocultar movimientos" : "Ver movimientos") : "Sin movimientos"}>
          <span>
            <IconButton
              size="small"
              disabled={!hasMovements}
              onClick={() => setOpen((o) => !o)}
              sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography color="text.secondary">Ingresos</Typography>
        <Typography sx={{ fontWeight: 600 }}>{fmt(income)}</Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography color="text.secondary">Egresos</Typography>
        <Typography sx={{ fontWeight: 600 }}>{fmt(expenses)}</Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography sx={{ fontWeight: 700 }}>Balance</Typography>
        <Typography sx={{ fontWeight: 700, color: balance >= 0 ? POSITIVE : NEGATIVE }}>
          {signedFmt(balance)}
        </Typography>
      </Box>

      {/* Detalle movimiento por movimiento */}
      <Collapse in={open} unmountOnExit>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
          Movimientos ({movements.length})
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {movements.map((m) => (
            <Box
              key={m.id}
              sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ width: 44, flexShrink: 0 }}>
                {formatShortDate(m.fecha)}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.descripcion}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: m.tipo === "ingreso" ? POSITIVE : NEGATIVE }}
              >
                {m.tipo === "ingreso" ? "+" : "−"}{fmt(m.importe)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Card>
  )
}

export default function CashboxPage() {
  const { role } = useAuth()
  const isSocio = role === "socio"

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf("month"))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs().endOf("month"))
  const [analysis, setAnalysis] = useState<CashboxAnalysis | null>(null)
  const [cashMethodId, setCashMethodId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    findCashMethodId().then(setCashMethodId)
  }, [])

  useEffect(() => {
    if (!startDate || !endDate) return
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const data = await fetchCashboxAnalysis(
          startDate!.format("YYYY-MM-DD"),
          endDate!.format("YYYY-MM-DD"),
          cashMethodId
        )
        setAnalysis(data)
      } catch {
        setFetchError("No se pudo cargar la caja.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate, cashMethodId])

  const cashIncome = analysis?.cashIncome ?? 0
  const cashExpenses = analysis?.cashExpenses ?? 0
  const cashBalance = cashIncome - cashExpenses

  const bankIncome = analysis?.bankIncome ?? 0
  const bankExpenses = analysis?.bankExpenses ?? 0
  const bankBalance = bankIncome - bankExpenses

  return (
    <Box sx={{ p: 3, flexGrow: 1, minHeight: 0, overflow: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Caja</Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 2, mb: 4, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
        <CustomDateRangePicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
        <Button
          variant="contained"
          sx={{ ml: "auto" }}
          disabled={!analysis || !startDate || !endDate}
          onClick={async () => {
            if (!analysis || !startDate || !endDate) return
            try {
              const opening = await fetchOpeningBalances(startDate.format("YYYY-MM-DD"), cashMethodId)
              await exportCashboxToExcel(
                analysis,
                opening,
                startDate.format("YYYY-MM-DD"),
                endDate.format("YYYY-MM-DD")
              )
            } catch {
              setFetchError("No se pudo exportar el Excel.")
            }
          }}
        >
          Exportar a Excel
        </Button>
      </Box>

      {fetchError && <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>}

      {loading || !analysis ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Accounts (flujo de fondos — incluye retiros) */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 4 }}>
            <AccountCard
              title="Caja efectivo"
              income={cashIncome}
              expenses={cashExpenses}
              balance={cashBalance}
              movements={analysis.cashMovements}
            />
            <AccountCard
              title="Caja banco"
              income={bankIncome}
              expenses={bankExpenses}
              balance={bankBalance}
              movements={analysis.bankMovements}
            />
          </Box>

          {/* Resultado del período + detalle expandible (unificado) */}
          <Card>
            <Box sx={{ p: 3, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {isSocio ? "Resultado del período" : "Detalle"}
              </Typography>
              <Tooltip
                title={
                  isSocio
                    ? "Devengado: cuotas facturadas vs egresos por fecha de emisión. Percibido: cobros vs egresos efectivamente pagados. Tocá cada fila para ampliar el detalle. Los retiros de socios no se computan en el resultado."
                    : "Tocá cada fila para ampliar el detalle. El percibido de ingresos figura solo a nivel total: los pagos no se imputan a un concepto específico."
                }
              >
                <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Concepto</TableCell>
                    <TableCell align="right">Devengado</TableCell>
                    <TableCell align="right">Percibido</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Ingresos */}
                  <CashboxDetailRow
                    node={{
                      id: "ingresos",
                      label: "Ingresos",
                      amount: analysis.ingresos,
                      children: analysis.ingresosTree
                    }}
                  />
                  {/* Egresos (sin retiros) */}
                  <CashboxDetailRow
                    node={{
                      id: "egresos",
                      label: "Egresos (sin retiros)",
                      amount: analysis.egresos,
                      children: analysis.egresosTree
                    }}
                  />
                  {/* Resultado — solo socio */}
                  {isSocio && (
                    <TableRow sx={{ "& td": { borderTop: 2, borderColor: "divider" } }}>
                      <TableCell sx={{ pl: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Resultado</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: analysis.resultado.devengado >= 0 ? POSITIVE : NEGATIVE }}>
                        {signedFmt(analysis.resultado.devengado)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: analysis.resultado.percibido >= 0 ? POSITIVE : NEGATIVE }}>
                        {signedFmt(analysis.resultado.percibido)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Retiros informativo + reconciliación — solo socio */}
            {isSocio && (
              <Box sx={{ p: 3, pt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Retiros de socios (no afectan el resultado)</Typography>
                  <Typography sx={{ fontWeight: 600, color: NEGATIVE }}>{fmt(analysis.retiros)}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Caja = Resultado percibido − Retiros = {signedFmt(analysis.resultado.percibido - analysis.retiros)}
                </Typography>
              </Box>
            )}
          </Card>
        </>
      )}
    </Box>
  )
}
