import { DEMO_MODE } from "../../config"
import { liveAuth } from "./live"
import { demoAuth } from "./demo"
import type { AuthBackend } from "./types"

export const auth: AuthBackend = DEMO_MODE ? demoAuth : liveAuth

export type { AuthEvent, AuthResult, AuthSession, AuthUser, UserRole } from "./types"
