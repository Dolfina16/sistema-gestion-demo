# Residencia — Roadmap de Desarrollo

> App de gestión administrativa y financiera de una residencia geriátrica.
> Stack: React + TypeScript + MUI + Vite · Supabase (Postgres + Auth + RLS), **sin backend propio**.

## Decisiones tomadas (2026-06-21)

| Tema | Decisión |
|---|---|
| **Backend** | Supabase directo (Postgres + Auth + RLS). Sin servidor propio. Usar `@supabase/supabase-js`, quitar `axios`. |
| **Roles** | Dos roles: `socio` (admin total) y `administrativo` (operativo, sin retiros ni rentabilidad). Vía RLS de Postgres + `profiles.rol`. |
| **Facturación** | Cuota mensual **automática** (job idempotente `pg_cron`/Edge Function) + cargos adicionales manuales. |
| **Plazo** | MVP en semanas: mínimo para reemplazar la planilla actual. |
| **Base de datos** | **Schema SQL ya creado en Supabase.** Falta conectar el frontend, Auth y verificar RLS. |

## Estado real del repo (al 2026-06-21)

- ✅ Frontend maquetado: páginas (Huéspedes, Facturación, Egresos, Caja, Login) + modales.
- ✅ Schema SQL creado en Supabase.
- ❌ Frontend **sin conexión a datos** (no hay cliente Supabase ni llamadas reales).
- ❌ Login no autentica; rutas **sin guard** (`/pacientes` accesible sin sesión).
- ❌ `Dashboard.tsx` existe pero **no está ruteado**.
- ⚠️ Dos modales de cobro (`AddPaymentModal` y `AddCollectionModal`) con criterio ambiguo.
- ⚠️ Dependencias muy nuevas (React 19, MUI 9, Vite 8, TS 6): fijar versiones durante el MVP.

---

## 1. Fases del roadmap (sprints ~1 semana)

| Fase | Semana | Objetivo | Resultado |
|---|---|---|---|
| **F0 – Cimientos** | S1 | Cliente Supabase + Auth + guard de rutas + verificar RLS | Login funcional contra el schema existente |
| **F1 – Huéspedes** | S1-2 | CRUD de huéspedes contra Supabase | Alta/edición/baja lógica real |
| **F2 – Cuenta corriente** | S2-3 | Ingresos (manual) + pagos + saldo por huésped | Saldo en vivo |
| **F3 – Facturación automática** | S3 | Job mensual que genera la cuota de cada activo | Cargos del mes automáticos |
| **F4 – Egresos** | S4 | Carga de egresos por tipo (gasto/sueldo/impuesto/retiro) | Registro de salidas |
| **F5 – Dashboard + Caja** | S4-5 | Tablero financiero + caja del mes | Foto económica |
| **F6 – Reportes + permisos finos** | S5-6 | Reportes exportables + ocultar lo sensible al operador | Sistema usable por personal admin |

> **Fin de F2 = ya reemplaza la planilla** para lo más importante (quién debe cuánto).

## 2. MVP mínimo funcional

**Dentro:** Auth+roles+guard · CRUD huéspedes (baja lógica) · ingresos (auto+manual) · pagos · saldo por huésped (vista) · egresos básicos · dashboard mínimo (deuda total, top deudores, caja del mes).

**Fuera (v2):** sueldos con desglose · impuestos como módulo · reportes exportables · permisos por campo · adjuntar comprobantes.

## 3. Priorización (MoSCoW)

- **Must:** Auth+roles, CRUD huéspedes, ingresos+pagos+saldo, facturación automática.
- **Should:** egresos básicos, dashboard, caja mensual.
- **Could:** reportes exportables, sueldos detallados, impuestos, adjuntar comprobantes.
- **Won't (por ahora):** stock, liquidación de haberes, gestión médica, AFIP, bancos.

## 4. Módulos

```
HUÉSPEDES        FINANCIERO        ADMINISTRACIÓN
• Pacientes      • Ingresos        • Egresos (gastos/sueldos/
• Cta cte        • Pagos             impuestos/retiros)
• Cobertura      • Saldos
                 • Caja
        REPORTES Y DASHBOARD
   NÚCLEO: Auth + Roles + Supabase
```

### Modelo de datos (referencia — ya creado en Supabase)

| Tabla | Notas |
|---|---|
| `profiles` | id (=auth.uid), nombre, **rol** (`socio`/`administrativo`) |
| `patients` | datos + cuota_mensual + fecha_alta/baja + activo (baja lógica) |
| `incomes` | patient_id, periodo, importe, concepto — genera deuda |
| `payments` | patient_id, fecha, importe, metodo_pago — cobro, sin imputar |
| `egresos` | tipo + fechas + importe + metodo + comprobante (+ supplier/rubro/socio/legajo según tipo) |
| `suppliers` | proveedores para gastos |
| `v_patient_balance` | **vista**: saldo = Σ ingresos − Σ pagos (nunca columna) |

> ✅ **A verificar sobre el schema existente:** que el saldo sea una **vista** (no columna), que `incomes` tenga `UNIQUE(patient_id, periodo, tipo)` para idempotencia de facturación, y que las **políticas RLS** estén activas por tabla.

## 5. Pantallas

| Pantalla | Estado | Acción |
|---|---|---|
| Login | Maqueta | Conectar Supabase Auth + guard |
| Huéspedes | Existe | Conectar datos, baja lógica |
| Ficha/Cta cte | `PatientBalanceModal` | Ingresos+pagos+saldo |
| Facturación/Ingresos | `BillingPage` | Manual + ver cargos automáticos |
| Pagos | 2 modales | Consolidar criterio |
| Egresos | `ExpensesPage` | 4 tipos |
| Caja | `CashBoxPage` | Cobros − pagos del período |
| Dashboard | Existe, sin ruta | Rutear + KPIs por rol |
| Reportes | No existe | Post-MVP |

## 6. Flujo de navegación

```
Login ──(auth ok)──> MainLayout (AppBar + menú)
   Dashboard · Huéspedes · Facturación · Egresos · Caja · Reportes
   Huéspedes → Ficha → Cta cte (ingresos/pagos/saldo)
   Retiros y rentabilidad: solo rol `socio`
```
Toda ruta bajo `MainLayout` exige sesión (hoy no lo exige → bloqueante en F0).

## 7. Servicios (Supabase directo, en `src/services/`)

| Servicio | Operación | Mecanismo |
|---|---|---|
| `auth` | login/logout/sesión/rol | Supabase Auth + `profiles` |
| `patients` | list/get/create/update/baja | `from('patients')` + RLS |
| `incomes` | list por huésped, cargo manual | `from('incomes')` |
| `payments` | list por huésped, registrar | `from('payments')` |
| `balances` | saldo / deuda total | `from('v_patient_balance')` |
| `egresos` | CRUD por tipo, filtros fecha | `from('egresos')` + RLS |
| `cashbox` | caja del período | vista |
| `generate_monthly_charges` | cargo mensual automático | Edge Function + `pg_cron`, idempotente |

## 8. Permisos y roles (RLS — la barrera real)

| Recurso | `socio` | `administrativo` |
|---|---|---|
| Huéspedes | CRUD | Crear/editar |
| Ingresos / Pagos | CRUD | Crear/leer |
| Egresos (gasto/sueldo/impuesto) | CRUD | Crear/leer |
| **Egresos: retiros** | CRUD | **Sin acceso** |
| Dashboard/Reportes | Completo | Limitado |
| Gestión de usuarios | Sí | No |

```sql
create policy "retiros solo socios" on egresos
  for all using ( tipo <> 'retiro' or auth_rol() = 'socio' );
```
> 🔒 Ocultar en el front es cosmético: la seguridad real es RLS. Verificar que esté activa en el schema existente.

## 9. Reportes recomendados

| Reporte | Prioridad |
|---|---|
| Deudores (saldo por huésped) | MVP |
| Caja mensual (cobros − pagos) | MVP |
| Estado de resultados simple | Should |
| Egresos por tipo/rubro y período | Should |
| Evolución mensual ingresos vs egresos | Could |
| Retiros por socio (solo `socio`) | Could |
| Antigüedad de deuda (aging) | Futuro |

## 10. Complejidad por módulo

| Módulo | Complejidad |
|---|---|
| Cliente Supabase + Auth + guard | 🟡 Media |
| RLS + roles | 🔴 Alta |
| CRUD Huéspedes | 🟢 Baja (UI lista) |
| Ingresos + Pagos + Saldo | 🟡 Media |
| Facturación automática | 🔴 Alta |
| Egresos (4 tipos) | 🟡 Media |
| Dashboard + Caja | 🟡 Media |
| Reportes + export | 🟡 Media (post-MVP) |

## 11. Orden óptimo de implementación

1. Cliente Supabase + Auth + guard de rutas (schema ya existe).
2. **Verificar/ajustar RLS y roles** — no posponer.
3. CRUD Huéspedes (victoria rápida).
4. Ingresos + Pagos + vista de saldo (corazón del negocio).
5. Facturación automática.
6. Egresos.
7. Dashboard + Caja.
8. Reportes + permisos finos + export.

> Regla: nada de UI nueva hasta que datos+auth+RLS estén firmes.

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| Rutas sin auth hoy | Guard + RLS en F0 (bloqueante) |
| RLS no verificada | Auditar políticas del schema existente |
| Saldo como columna | Usar vista calculada |
| Facturación duplica cargos | `UNIQUE` + función idempotente |
| `axios` sin backend | Eliminar, usar SDK Supabase |
| 2 modales de cobro ambiguos | Consolidar |
| Deps bleeding edge | Fijar versiones durante MVP |
| Sin backups | Activar backups de Supabase ya |
| Moneda con `float` | Usar `numeric`/centavos |

## 13. Funcionalidades futuras (v2+)

Empleados + liquidación de sueldos · tablas maestras de socios/rubros (reemplazar IDs hardcodeados) · adjuntar comprobantes (Storage) · imputación de pagos a períodos · export contable / AFIP / bancos · aging + recordatorios de cobro · auditoría (`audit_log`) · PWA móvil.

---

## Próximo paso

**F0:** instalar `@supabase/supabase-js`, configurar cliente con variables de entorno, conectar Auth, agregar guard de rutas y **verificar que la RLS del schema existente cubra los dos roles**.
