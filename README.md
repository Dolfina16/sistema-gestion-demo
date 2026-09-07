# Sistema de gestión para residencia geriátrica

Sistema web de **gestión administrativa y financiera** para una residencia geriátrica:
administración de huéspedes, cuenta corriente, **facturación electrónica AFIP**, egresos y caja.

Reemplaza la planilla de cálculo con la que se llevaba la operación, digitalizando el circuito
completo: quién debe cuánto, emisión de comprobantes fiscales, control de gastos y foto de caja.

> 📄 **Manual de uso para el usuario final:** [`docs/manual-cliente.md`](docs/manual-cliente.md)

> **Estado:** aplicación terminada y en uso real. Único pendiente / próximo paso: un
> **dashboard con gráficos** (indicadores de deuda, cobros, egresos y evolución mensual).

---

## Probarlo

```bash
cd frontend && npm install && npm run dev
```

Sin ninguna variable de entorno la app arranca en **modo demo**: un conjunto de datos
ficticios en memoria, sin base de datos ni credenciales. Las credenciales de acceso se
muestran en la propia pantalla de login.

> Los datos de la demo (residentes, proveedores, importes, CUITs) son **inventados**.
> Este repositorio no contiene información de ninguna residencia real.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | **React 19 + TypeScript**, **MUI v9**, **Vite** |
| Backend / datos | **Supabase** — PostgreSQL + Auth + **RLS** (sin servidor propio) |
| Funciones privilegiadas | **Supabase Edge Functions** (Deno) — gestión de usuarios |
| Automatizaciones | **n8n** — facturación AFIP, envío de mails, OCR de comprobantes |
| Facturación electrónica | **Afip SDK** (WSFEv1) vía n8n |
| Exportables | **ExcelJS** (planillas con estilos, carga diferida) |
| Deploy | **Vercel** (frontend) · **Oracle Cloud + Cloudflare Tunnel** (n8n) |

---

## Arquitectura

```
┌─────────────┐     Supabase JS      ┌──────────────────────────────┐
│  Frontend   │ ───────────────────▶ │ Supabase                     │
│  (Vercel)   │                      │  • Auth (JWT)                │
│  React+MUI  │ ◀─── RLS ──────────▶ │  • PostgreSQL + RLS          │
└──────┬──────┘                      │  • Edge Function manage-users│
       │                             └──────────────────────────────┘
       │ HTTPS (webhooks, Bearer)
       ▼
┌──────────────────────────────┐     ┌───────────────┐
│  n8n (Oracle + Cloudflare)   │ ──▶ │ AFIP (WSFEv1) │
│  • Facturación (Afip SDK)    │     │  vía Afip SDK │
│  • Avisos / aumentos (SMTP)  │     └───────────────┘
│  • OCR de facturas/recibos   │
└──────────────────────────────┘
```

**Sin backend propio:** el frontend habla directo con Supabase (datos protegidos por RLS de
Postgres) y dispara automatizaciones en n8n por webhook. Las operaciones que requieren la
`service_role` de Supabase (crear usuarios, resetear contraseñas) viven en una **Edge Function**,
nunca en el bundle público.

---

## Funcionalidades

### Autenticación y usuarios
- Login con Supabase Auth; sesión y rol (`socio` / `administrativo`) desde tabla `profiles`.
- **Recuperación de contraseña** por email (`resetPasswordForEmail` + pantalla de nueva clave
  al volver del link, vía evento `PASSWORD_RECOVERY`).
- **Gestión de usuarios** (crear, cambiar contraseña, listar) a través de una Edge Function que
  valida el JWT del llamador y usa la `service_role` server-side.

### Huéspedes y cuenta corriente
- CRUD con **baja lógica** (nunca se borra: se conserva el historial y la deuda).
- **Saldo** calculado por una **vista** de Postgres (`Σ ingresos − Σ pagos`), no una columna.
- Cuenta corriente unificada (cargos + pagos), registro de pagos y **detalle de deudores**
  (incluye inactivos con deuda).

### Facturación mensual (AFIP)
- Generación **idempotente** de la cuota del mes por huésped (`UNIQUE(huésped, período)`).
- Selección por huésped de **forma de facturación**: OS exenta + resto (exento / IVA 21%),
  Total IVA 21%, **Total IVA 10,5%** — con cálculo de IVA por alícuota.
- Emisión real de comprobantes con **Afip SDK** (WSFEv1) orquestada en n8n, secuencial por la
  numeración del punto de venta.
- **Marcado fail-closed:** un huésped se marca *Facturado* **solo** con confirmación `ok:true`
  (con CAE) del workflow → los fallos de n8n nunca generan falsos positivos.
- **Anti-duplicación:** los ya facturados no se re-emiten; distinción emitido-pero-no-entregado
  (CAE ok, mail falló) vs no-emitido.
- Estados por período (`pendiente` / `facturado` / `enviado`) y **avisos de cuota** por mail a
  los no facturables.

### Egresos
- Cuatro tipos (gasto / sueldo / impuesto / retiro) con subtablas por tipo.
- Toggle de pago con método y fecha; solo los **pagados** impactan en la caja.

### Caja
- Análisis **devengado vs percibido**, split efectivo/banco, árbol de conceptos y
  reconciliación de retiros (sección de rentabilidad restringida a `socio`).
- **Export a Excel** con ExcelJS: hoja Resumen + movimientos por caja con **saldo corriente**,
  saldo inicial y de cierre, colores e importes en formato moneda (librería con **carga diferida**
  para no pesar el bundle inicial).

---

## Decisiones de ingeniería

- **RLS como barrera real de seguridad**, no el frontend. Ocultar en la UI es cosmético.
- **`service_role` jamás en el cliente**: las operaciones de admin pasan por Edge Function con
  validación de JWT.
- **Idempotencia** en la facturación para evitar cargos/comprobantes duplicados.
- **Fail-closed** en el marcado de facturado: ante respuesta ambigua, se asume error.
- **Validación previa** antes de disparar a n8n/AFIP (CUIT, email, montos) con mensajes claros
  en el resumen, en vez de errores crípticos de AFIP.
- **Code-splitting** de dependencias pesadas (ExcelJS) con `import()` dinámico.
- **Dinero** en `numeric`, IVA calculado como `total − netoRedondeado` para cerrar exacto con AFIP.
- **Capa de datos intercambiable**: las páginas no conocen a Supabase. Cada servicio existe
  dos veces —`services/live/` (Supabase) y `services/demo/` (memoria)— detrás de un módulo
  selector. La anotación `const impl: typeof live` hace que TypeScript falle en compilación
  si las dos implementaciones se desalinean. Gracias a eso la app se puede correr y mostrar
  sin backend, sin ramas `if (demo)` desparramadas por la UI.
- **Lógica de negocio fuera de la capa de datos**: el análisis de caja (devengado/percibido,
  split efectivo/banco, árbol de conceptos) vive en `services/cashboxAnalysis.ts` como función
  pura. Las dos implementaciones solo se ocupan de traer los datos y delegan el cálculo.

---

## Modelo de datos (resumen)

| Tabla / vista | Rol |
|---|---|
| `profiles` | usuario + rol (`socio`/`administrativo`), 1:1 con `auth.users` |
| `huespedes` | datos + cuota, monto obra social, contacto, baja lógica |
| `ingresos` | cargos por período (deuda) |
| `pagos` | cobros con método de pago |
| `v_saldo_huesped` | **vista**: saldo = Σ ingresos − Σ pagos |
| `egresos` + `gastos`/`sueldos`/`impuestos`/`retiros` | egresos por tipo |
| `facturacion_estado` | estado de facturación por huésped/período |
| `metodos_pago`, `rubros`, `proveedores` | catálogos |

> El esquema SQL y las guías de infraestructura no se incluyen en este repositorio público.

---

## Puesta en marcha (local)

```bash
cd frontend
npm install
npm run dev
```

Variables en `frontend/.env.local` (no se commitea). **Son opcionales**: sin ellas la app
corre en modo demo. Ver [`frontend/.env.example`](frontend/.env.example):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_N8N_WEBHOOK_URL=...            # facturación
VITE_N8N_WEBHOOK_TOKEN=...          # Bearer para los webhooks
VITE_N8N_AVISOS_URL=...             # avisos de cuota
VITE_N8N_AUMENTOS_URL=...           # notificación de aumentos
VITE_N8N_FACTURAS_URL=...           # OCR de facturas
VITE_N8N_SUELDOS_URL=...            # import de recibos
```

En **producción (Vercel)** las mismas variables van en *Settings → Environment Variables*
(las `VITE_*` se inlinean en **build time**: cambiarlas requiere redeploy).

## Licencia

© 2026. Todos los derechos reservados.

Este repositorio se publica como **muestra de trabajo**. Se puede leer y evaluar el código;
no se otorga licencia para copiarlo, redistribuirlo ni usarlo en obras derivadas.

---

Más documentación:
- **Manual de uso** (con capturas anotadas): [`docs/manual-cliente.md`](docs/manual-cliente.md) · [PDF](docs/Manual-de-uso.pdf)
- **Roadmap** y módulos: [`docs/ROADMAP.md`](docs/ROADMAP.md)

El manual se **regenera**, no se edita a mano: el markdown es la fuente y de ahí salen las
capturas y el PDF. Cuando cambia la interfaz, [`docs/screenshots-gen`](docs/screenshots-gen)
rehace las capturas anotadas desde la app en modo demo (los globos numerados se anclan a los
elementos reales, no a coordenadas fijas) y [`docs/manual-pdf`](docs/manual-pdf) rearma el PDF.

---

## Estructura

```
frontend/
  src/
    pages/          Login, Guests, Billing, Expenses, Cashbox, ResetPassword
    components/     modales y UI (formularios, caja, gestión de usuarios)
    services/       selector de implementación + lógica pura compartida
      live/         acceso real a Supabase y a los webhooks de n8n
      demo/         misma API resuelta contra datos en memoria
      auth/         backend de autenticación (live | demo) detrás de un contrato propio
    demo/           dataset ficticio y base de datos en memoria
    context/        AuthContext (sesión, rol, recuperación)
    config.ts       elección de backend (live vs demo)
supabase/
  functions/manage-users/   Edge Function (gestión de usuarios)
docs/               roadmap, manual de uso (+ PDF) y capturas anotadas
  screenshots-gen/  rehace las capturas anotadas desde la app en modo demo
  manual-pdf/       rearma el PDF del manual a partir del markdown
```
