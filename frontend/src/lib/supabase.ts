import { createClient } from "@supabase/supabase-js"
import { DEMO_MODE } from "../config"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// En modo demo este cliente se construye pero no se usa nunca: la app resuelve
// todo contra `services/demo`. Se lo deja instanciado con valores de descarte
// para que los módulos `services/live` sigan importándose sin romper.
if (!DEMO_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local"
  )
}

export const supabase = createClient(
  supabaseUrl ?? "https://demo.invalid",
  supabaseAnonKey ?? "demo-anon-key"
)
