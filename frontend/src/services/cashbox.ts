// Selector de implementación: Supabase en producción, datos en memoria en la demo.
// La anotación `typeof live` obliga a que ambas implementaciones expongan el mismo
// contrato — si una firma se desalinea, falla la compilación en vez de en runtime.
//
// El cálculo del análisis no está duplicado: las dos implementaciones cargan los
// datos a su manera y delegan en `cashboxAnalysis`.
import { DEMO_MODE } from "../config"
import * as live from "./live/cashbox"
import * as demo from "./demo/cashbox"

export type {
  AmountPair,
  CashboxAnalysis,
  CashMovement,
  DetailNode,
  OpeningBalances,
} from "./cashboxAnalysis"

const impl: typeof live = DEMO_MODE ? demo : live

export const {
  fetchCashboxAnalysis,
  fetchOpeningBalances,
  findCashMethodId,
} = impl
