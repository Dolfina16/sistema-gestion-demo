// ============================================================
// Selección de backend
// ============================================================
// La app corre contra dos implementaciones intercambiables del mismo contrato
// de servicios (ver `src/services/`):
//
//   • live — Supabase (PostgreSQL + Auth + RLS + Edge Functions). Es el modo
//     con el que corre en producción.
//   • demo — un conjunto de datos ficticios en memoria, sin backend. Sirve para
//     la demo pública: se puede clonar el repo y levantar la app sin credenciales
//     ni base de datos, y ningún dato real queda expuesto.
//
// Resolución, de mayor a menor prioridad:
//   1. VITE_DEMO_MODE="true" | "false" — fuerza el modo explícitamente.
//   2. Si hay credenciales de Supabase configuradas → live.
//   3. Si no hay nada configurado → demo (así `npm run dev` funciona recién clonado).

const forced = import.meta.env.VITE_DEMO_MODE

const hasSupabaseConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export const DEMO_MODE =
  forced === "true" ? true : forced === "false" ? false : !hasSupabaseConfig
