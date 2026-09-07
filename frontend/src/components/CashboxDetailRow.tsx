import { Fragment, useEffect, useRef, useState } from "react"

import { Box, IconButton, TableCell, TableRow, Typography } from "@mui/material"
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight"

import type { DetailNode } from "../services/cashbox"

function fmt(n: number) {
  if (n === 0) return "—"
  return `$${Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
}

type Props = {
  node: DetailNode
  depth?: number
}

// Renderiza la fila del nodo y, si está expandida, sus hijos recursivamente —
// todas como TableRow hermanas dentro del mismo TableBody para alinear columnas.
export default function CashboxDetailRow({ node, depth = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const hasChildren = !!node.children && node.children.length > 0
  const rowRef = useRef<HTMLTableRowElement>(null)

  // Al expandir, llevar la fila al tope del viewport scrollable para que
  // la información desplegada quede visible debajo. Espera 1 frame a que
  // los hijos se hayan montado.
  useEffect(() => {
    if (!open || !rowRef.current) return
    const raf = requestAnimationFrame(() => {
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  return (
    <Fragment>
      <TableRow
        ref={rowRef}
        hover={hasChildren}
        sx={{ cursor: hasChildren ? "pointer" : "default", scrollMarginTop: 8 }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <TableCell sx={{ pl: 2 + depth * 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {hasChildren ? (
              <IconButton
                size="small"
                sx={{
                  p: 0.25,
                  transform: open ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s",
                }}
              >
                <KeyboardArrowRightIcon fontSize="small" />
              </IconButton>
            ) : (
              <Box sx={{ width: 24 }} />
            )}
            <Typography
              sx={{ fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400, fontSize: "0.9rem" }}
            >
              {node.label}
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: depth === 0 ? 700 : 500 }}>
          {fmt(node.amount.devengado)}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: depth === 0 ? 700 : 500 }}>
          {fmt(node.amount.percibido)}
        </TableCell>
      </TableRow>

      {hasChildren &&
        open &&
        node.children!.map((child) => (
          <CashboxDetailRow key={child.id} node={child} depth={depth + 1} />
        ))}
    </Fragment>
  )
}
