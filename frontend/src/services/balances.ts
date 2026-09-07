// Selector de implementación: Supabase en producción, datos en memoria en la demo.
// La anotación `typeof live` obliga a que ambas implementaciones expongan el mismo
// contrato — si una firma se desalinea, falla la compilación en vez de en runtime.
import { DEMO_MODE } from "../config"
import * as live from "./live/balances"
import * as demo from "./demo/balances"

const impl: typeof live = DEMO_MODE ? demo : live

export const {
  fetchAllBalances,
  fetchGuestBalance,
} = impl
