import type { CashboxAnalysis, CashMovement, OpeningBalances } from "./cashbox"

// Formato moneda AR: $ con separador de miles, sin decimales → $5.400.000
const MONEY = '"$"#,##0'

// Paleta (ARGB). Texto + fondo claro para ingresos (verde) y egresos (rojo).
const GREEN = "FF2E7D32"
const GREEN_BG = "FFE8F3E8"
const RED = "FFC62828"
const RED_BG = "FFFBEAEA"
const HEADER_BG = "FFC57B57" // terracota Residencia
const HEADER_TXT = "FFFFFFFF"
const INK = "FF5E4636"

// "YYYY-MM-DD" → "DD/MM/YYYY"
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

// Color según signo del saldo.
const signColor = (n: number) => (n >= 0 ? GREEN : RED)

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Genera y descarga una planilla con hoja Resumen (saldo inicial + ingresos +
// egresos + saldo al cierre, por caja y total) y una hoja de movimientos por caja
// con saldo corriente. Ingresos en verde, egresos en rojo, importes en formato moneda.
export async function exportCashboxToExcel(
  analysis: CashboxAnalysis,
  opening: OpeningBalances,
  startISO: string,
  endISO: string
): Promise<void> {
  // Import dinámico: ExcelJS (pesado) se carga recién al exportar, no en el bundle inicial.
  const { default: ExcelJS } = await import("exceljs")

  const wb = new ExcelJS.Workbook()
  wb.creator = "Residencia"

  const cashClose = opening.cash + analysis.cashIncome - analysis.cashExpenses
  const bankClose = opening.bank + analysis.bankIncome - analysis.bankExpenses
  const openTotal = opening.cash + opening.bank
  const totalIncome = analysis.cashIncome + analysis.bankIncome
  const totalExpenses = analysis.cashExpenses + analysis.bankExpenses
  const closeTotal = cashClose + bankClose

  // ── Hoja Resumen ─────────────────────────────────────────
  const rs = wb.addWorksheet("Resumen")
  rs.columns = [{ width: 16 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 18 }]

  rs.addRow(["Caja — Residencia"]).getCell(1).font = { bold: true, size: 16, color: { argb: INK } }
  rs.addRow([`Período: ${fmtDate(startISO)} a ${fmtDate(endISO)}`]).getCell(1).font = { italic: true, color: { argb: INK } }
  rs.addRow([])

  const head = rs.addRow(["", "Saldo inicial", "Ingresos", "Egresos", "Saldo al cierre"])
  head.eachCell((c) => {
    c.font = { bold: true, color: { argb: HEADER_TXT } }
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }
    c.alignment = { horizontal: "center" }
  })

  const summaryRow = (label: string, open: number, inc: number, exp: number, close: number, bold = false) => {
    const r = rs.addRow([label, open, inc, exp, close])
    r.getCell(1).font = { bold: true, color: { argb: INK } }
    const o = r.getCell(2); o.numFmt = MONEY; o.font = { color: { argb: signColor(open) }, bold }
    const ing = r.getCell(3); ing.numFmt = MONEY; ing.font = { color: { argb: GREEN }, bold }
    const egr = r.getCell(4); egr.numFmt = MONEY; egr.font = { color: { argb: RED }, bold }
    const c = r.getCell(5); c.numFmt = MONEY; c.font = { color: { argb: signColor(close) }, bold: true }
  }
  summaryRow("Efectivo", opening.cash, analysis.cashIncome, analysis.cashExpenses, cashClose)
  summaryRow("Banco", opening.bank, analysis.bankIncome, analysis.bankExpenses, bankClose)
  summaryRow("Total", openTotal, totalIncome, totalExpenses, closeTotal, true)

  // ── Hojas de movimientos (con saldo corriente) ───────────
  const movSheet = (name: string, movs: CashMovement[], openBal: number) => {
    const ws = wb.addWorksheet(name)
    ws.columns = [{ width: 12 }, { width: 42 }, { width: 12 }, { width: 16 }, { width: 16 }]

    const h = ws.addRow(["Fecha", "Concepto", "Tipo", "Importe", "Saldo"])
    h.eachCell((c) => {
      c.font = { bold: true, color: { argb: HEADER_TXT } }
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }
    })

    // Fila de saldo inicial (arrastre del período anterior)
    const openRow = ws.addRow(["", "Saldo inicial", "", "", openBal])
    openRow.getCell(2).font = { italic: true, color: { argb: INK } }
    const oc = openRow.getCell(5)
    oc.numFmt = MONEY
    oc.font = { bold: true, color: { argb: signColor(openBal) } }

    // Movimientos en orden cronológico (viejo → nuevo) para el saldo corriente
    const ordered = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha))
    let running = openBal
    for (const m of ordered) {
      const isInc = m.tipo === "ingreso"
      const signed = isInc ? m.importe : -m.importe
      running += signed
      const color = isInc ? GREEN : RED
      const bg = isInc ? GREEN_BG : RED_BG
      const r = ws.addRow([fmtDate(m.fecha), m.descripcion, isInc ? "Ingreso" : "Egreso", signed, running])
      r.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } } })
      r.getCell(3).font = { color: { argb: color }, bold: true }
      const imp = r.getCell(4)
      imp.numFmt = MONEY
      imp.font = { color: { argb: color }, bold: true }
      const sal = r.getCell(5)
      sal.numFmt = MONEY
      sal.font = { color: { argb: signColor(running) } }
    }

    // Fila de total = saldo al cierre
    ws.addRow([])
    const close = ws.addRow(["", "", "Saldo al cierre", "", running])
    close.getCell(3).font = { bold: true, color: { argb: INK } }
    const cc = close.getCell(5)
    cc.numFmt = MONEY
    cc.font = { bold: true, color: { argb: signColor(running) } }
  }
  movSheet("Caja efectivo", analysis.cashMovements, opening.cash)
  movSheet("Caja banco", analysis.bankMovements, opening.bank)

  const buf = await wb.xlsx.writeBuffer()
  triggerDownload(buf as ArrayBuffer, `caja_${startISO}_a_${endISO}.xlsx`)
}
