// Definición de las 10 pantallas del manual: cómo llegar, qué recortar y qué señala cada globo.
// ax/ay = punto de anclaje dentro del elemento (0..1). dx/dy = corrimiento en px.

const dlg = p => p.locator('[role=dialog]')
const paperOf = loc => loc.locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]')
const row = (p, i) => p.locator('tbody tr').nth(i)

const ALTA_CAMPOS = [
  ['Nombre', 'Obligatorio.'],
  ['Apellido', 'Obligatorio.'],
  ['CUIT', 'Necesario para facturar.'],
  ['Cobertura', 'Obra social o "Particular".'],
  ['Nombre del contacto', 'Familiar responsable.'],
  ['Teléfono del contacto', 'Del familiar.'],
  ['Email del contacto', 'Adonde llegan facturas y avisos.'],
  ['Cuota mensual', 'Importe que se cobra por mes.'],
  ['Monto obra social', 'Parte exenta / reintegro (opcional).'],
  ['Fecha de alta', 'Ingreso del residente.'],
  ['Observaciones', 'Notas libres (opcional).'],
]

export const SCREENS = [
  {
    file: 'login-anotada.png',
    title: 'Ingreso al sistema',
    noLogin: true,
    prep: async () => {},
    items: [
      { n: 1, title: 'Email', desc: 'Tu correo de acceso.',
        loc: p => p.locator('input').nth(0) },
      { n: 2, title: 'Contraseña', desc: 'Tu clave.',
        loc: p => p.locator('input').nth(1) },
      { n: 3, title: 'Ingresar', desc: 'Entra al sistema.',
        loc: p => p.getByRole('button', { name: /^ingresar$/i }) },
      { n: 4, title: '¿Olvidaste tu contraseña?',
        desc: 'Escribí tu email arriba y hacé clic: te llega un mail para crear una nueva.',
        loc: p => p.getByText(/olvidaste tu contrase/i).first() },
    ],
  },

  {
    file: 'huespedes-anotada.png',
    title: 'Pantalla de Huéspedes',
    prep: async () => {},
    items: [
      { n: 1, title: 'Menú', desc: 'Navegás entre Huéspedes, Facturación, Egresos y Caja.',
        loc: p => p.getByRole('link', { name: /^Huéspedes$/ }), ax: 1, dx: 6 },
      { n: 2, title: 'Cuenta', desc: 'Gestionar usuarios y cerrar sesión.',
        loc: p => p.getByRole('button', { name: /@demo\.app/ }), ax: 0, dx: -12 },
      { n: 3, title: 'Agregar huésped', desc: 'Carga un residente nuevo.',
        loc: p => p.getByRole('button', { name: /agregar hu/i }), ax: 0, dx: -10 },
      { n: 4, title: 'Huéspedes activos', desc: 'Cantidad de residentes.',
        loc: p => paperOf(p.getByText(/Huéspedes activos/i).first()), ax: 0, ay: 0, dy: 18 },
      { n: 5, title: 'Con deuda', desc: 'Cuántos deben; hacé clic para ver el detalle.',
        loc: p => paperOf(p.getByText(/Con deuda/i).first()), ax: 0, ay: 0, dy: 18 },
      { n: 6, title: 'Deuda total', desc: 'Suma de saldos pendientes.',
        loc: p => paperOf(p.getByText(/Deuda total pendiente/i).first()), ax: 0, ay: 0, dy: 18 },
      { n: 7, title: 'Acciones', desc: 'Por fila: ver saldo, editar y dar de baja.',
        loc: p => row(p, 0).getByRole('button').first(), ax: 0, dx: -16 },
    ],
  },

  {
    file: 'huespedes-alta-anotada.png',
    title: 'Ficha de huésped',
    prep: async p => {
      await p.getByRole('button', { name: /agregar hu/i }).click()
      await p.waitForTimeout(900)
    },
    items: ALTA_CAMPOS.map(([t, d], i) => ({
      n: i + 1, title: t, desc: d,
      loc: p => dlg(p).locator('.MuiFormControl-root').nth(i),
      ax: 0, ay: i === 10 ? 0.18 : 0.62, dx: 12,
    })).concat([{
      n: 12, title: 'Agregar huésped', desc: 'Guarda la ficha.',
      loc: p => dlg(p).getByRole('button', { name: /agregar hu/i }), ax: 0, dx: -10,
    }]),
  },

  {
    file: 'huespedes-saldo-anotada.png',
    title: 'Cuenta corriente',
    clip: p => dlg(p),
    prep: async p => {
      await p.getByRole('button', { name: /cuenta corriente/i }).nth(2).click()
      await p.waitForTimeout(1100)
    },
    items: [
      { n: 1, title: 'Estado', desc: '"Al día" o con deuda.',
        loc: p => dlg(p).locator('.MuiChip-root').first(), ax: 0, dx: -14 },
      { n: 2, title: 'Resumen', desc: 'Total de cargos, total pagado y saldo.',
        loc: p => dlg(p).locator('h6').nth(1), ax: 0, dx: -26 },
      { n: 3, title: 'Filtro', desc: 'Todos los movimientos, solo cargos o solo pagos.',
        loc: p => dlg(p).getByRole('button', { name: /^PAGOS/i }), ax: 1, dx: 18 },
      { n: 4, title: 'Agregar cargo', desc: 'Suma una deuda manual.',
        loc: p => dlg(p).getByRole('button', { name: /agregar cargo/i }), ax: 0, dx: -12 },
      { n: 5, title: 'Registrar pago', desc: 'Carga un cobro (fecha, importe, método).',
        loc: p => dlg(p).getByRole('button', { name: /registrar pago/i }), ax: 0, dx: -12 },
      { n: 6, title: 'Cerrar', desc: 'Sale del detalle.',
        loc: p => dlg(p).getByRole('button', { name: /^cerrar$/i }), ax: 0, dx: -12 },
    ],
  },

  {
    file: 'huespedes-deudores-anotada.png',
    title: 'Huéspedes con deuda',
    clip: p => dlg(p),
    prep: async p => {
      await p.getByText(/Con deuda/i).first().click()
      await p.waitForTimeout(1100)
    },
    items: [
      { n: 1, title: 'Estado', desc: 'Activo o de baja (los de baja con deuda también figuran).',
        loc: p => dlg(p).locator('.MuiChip-root').first(), ax: 0, dx: -14 },
      { n: 2, title: 'Saldo', desc: 'Deuda de cada huésped, de mayor a menor.',
        loc: p => dlg(p).locator('tbody tr').nth(0).locator('td').last(), ax: 0, dx: 25 },
      { n: 3, title: 'Deuda total', desc: 'Suma de todo lo adeudado.',
        loc: p => dlg(p).locator('h6').last(), ax: 0, dx: -14 },
      { n: 4, title: 'Cerrar', desc: 'Sale del listado.',
        loc: p => dlg(p).getByRole('button', { name: /^cerrar$/i }), ax: 0, dx: -12 },
    ],
  },

  {
    file: 'facturacion-anotada.png',
    title: 'Facturación mensual',
    nav: /facturaci/i,
    prep: async () => {},
    items: [
      { n: 1, title: 'Período', desc: 'El mes que estás facturando.',
        loc: p => p.locator('input[type=month]'), ax: 0, dx: -10 },
      { n: 2, title: 'Actualizar cuotas', desc: 'Cambia las cuotas (por % o valor fijo).',
        loc: p => p.getByRole('button', { name: /actualizar cuotas/i }), ax: 0, dx: -10 },
      { n: 3, title: 'Generar cargos', desc: 'Crea los cargos y factura/avisa a los seleccionados.',
        loc: p => p.getByRole('button', { name: /generar cargos/i }), ax: 0, dx: -10 },
      { n: 4, title: 'Resumen', desc: 'Total a facturar, IVA y neto; se actualiza según lo marcado.',
        loc: p => paperOf(p.getByText(/Total facturado/i).first()), ax: 0, ay: 0.5 },
      { n: 5, title: 'Seleccionar', desc: 'Tilde: a quién incluís en la corrida.',
        loc: p => row(p, 0).locator('input[type=checkbox]').first(), ax: 0.5 },
      { n: 6, title: 'Facturar', desc: 'Encendido: factura AFIP. Apagado: solo aviso de cuota.',
        loc: p => row(p, 0).locator('.MuiSwitch-root'), ax: 0, dx: -14 },
      { n: 7, title: 'Forma', desc: 'Cómo se arma el comprobante (obra social, total 21% o 10,5%).',
        loc: p => row(p, 0).locator('[role=combobox]'), ax: 1, dx: 20 },
      { n: 8, title: 'Estado', desc: 'Pendiente / Facturado / Enviado.',
        loc: p => row(p, 0).locator('.MuiChip-root'), ax: 0, dx: -14 },
    ],
  },

  {
    file: 'facturacion-actualizar-cuotas-anotada.png',
    title: 'Actualizar cuotas',
    nav: /facturaci/i,
    clip: p => dlg(p),
    prep: async p => {
      await p.getByRole('button', { name: /actualizar cuotas/i }).click()
      await p.waitForTimeout(900)
    },
    items: [
      { n: 1, title: 'Tipo', desc: 'Aumentar por porcentaje o fijar un valor.',
        loc: p => dlg(p).locator('label').filter({ hasText: /porcentaje de aumento/i }).first(),
        ax: 0, ay: 1, dx: 200, dy: 8 },
      { n: 2, title: 'Valor', desc: 'El % de aumento o el nuevo importe.',
        loc: p => dlg(p).locator('input[type=text]').first(), ax: 1, dx: -18 },
      { n: 3, title: 'Notificar por email', desc: 'Avisa el aumento a los huéspedes.',
        loc: p => dlg(p).locator('.MuiSwitch-root'), ax: 1, ay: 1, dx: 40, dy: 14 },
      { n: 4, title: 'Aplicar', desc: 'Confirma y actualiza las cuotas.',
        loc: p => dlg(p).getByRole('button', { name: /^aplicar$/i }), ax: 0, dx: -12 },
    ],
  },

  {
    file: 'egresos-anotada.png',
    title: 'Egresos',
    nav: /egresos/i,
    prep: async () => {},
    items: [
      { n: 1, title: 'Mes', desc: 'El período que ves.',
        loc: p => p.locator('input[type=month]'), ax: 0, dx: -10 },
      { n: 2, title: 'Importar sueldos', desc: 'Carga recibos de sueldo automáticamente.',
        loc: p => p.locator('label').filter({ hasText: /importar sueldos/i }).first(), ax: 0, dx: -10 },
      { n: 3, title: 'Importar facturas', desc: 'Carga facturas por foto o PDF automáticamente.',
        loc: p => p.locator('label').filter({ hasText: /importar facturas/i }).first(), ax: 0, dx: -10 },
      { n: 4, title: 'Nuevo egreso', desc: 'Crea un gasto, sueldo, impuesto o retiro.',
        loc: p => p.getByRole('button', { name: /nuevo egreso/i }), ax: 0, dx: -10 },
      { n: 5, title: 'Resumen', desc: 'Total del mes, pendiente de pago y pagado.',
        loc: p => paperOf(p.getByText(/Total del mes/i).first()), ax: 0, ay: 0, dy: 18 },
      { n: 6, title: 'Filtros', desc: 'Ver todos o por tipo (gastos, sueldos, etc.).',
        loc: p => p.getByRole('tab', { name: /^TODOS$/i }), ax: 0, dx: -12 },
      { n: 7, title: 'Acciones', desc: 'Por fila: editar, marcar como pagado y eliminar.',
        loc: p => row(p, 0).getByRole('button').first(), ax: 0, dx: -16 },
    ],
  },

  {
    file: 'caja-anotada.png',
    title: 'Caja',
    nav: /^caja$/i,
    prep: async () => {},
    items: [
      { n: 1, title: 'Rango de fechas', desc: 'El período que analizás (con atajos: mes actual, etc.).',
        loc: p => p.getByRole('button', { name: /\d{2}\/\d{2}\/\d{4}/ }), ax: 1, dx: 14 },
      { n: 2, title: 'Exportar a Excel', desc: 'Descarga la planilla con resumen y movimientos.',
        loc: p => p.getByRole('button', { name: /exportar a excel/i }), ax: 0, dx: -12 },
      { n: 3, title: 'Caja efectivo', desc: 'Ingresos, egresos y balance en efectivo.',
        loc: p => p.locator('h6').filter({ hasText: /caja efectivo/i }).first(), ax: 0, dx: -28 },
      { n: 4, title: 'Caja banco', desc: 'Ídem para transferencias, débito, etc.',
        loc: p => p.locator('h6').filter({ hasText: /caja banco/i }).first(), ax: 0, dx: -28 },
      { n: 5, title: 'Ver movimientos', desc: 'Despliega el detalle de cada caja.',
        loc: p => paperOf(p.locator('h6').filter({ hasText: /caja efectivo/i }).first())
          .getByRole('button').first(), ax: 0, dx: -16 },
      { n: 6, title: 'Resultado del período', desc: 'Ganancia/gasto en devengado y percibido (solo socios).',
        loc: p => p.locator('h6').filter({ hasText: /resultado del per/i }).first(), ax: 0, dx: -28 },
    ],
  },

  {
    file: 'usuarios-anotada.png',
    title: 'Gestión de usuarios',
    prep: async p => {
      await p.getByRole('button', { name: /@demo\.app/ }).click()
      await p.waitForTimeout(700)
      await p.getByRole('menuitem', { name: /usuario/i }).click()
      await p.waitForTimeout(1000)
      await dlg(p).locator('input[type=text]').first().fill('Laura Giménez')
      await dlg(p).locator('input[type=email]').first().fill('laura@demo.app')
      await dlg(p).locator('input[type=password]').first().fill('demo1234')
      await p.waitForTimeout(400)
    },
    items: [
      { n: 1, title: 'Pestañas', desc: 'Crear un usuario nuevo o cambiar una contraseña.',
        loc: p => dlg(p).getByRole('tab', { name: /crear usuario/i }), ax: 0, dx: 14 },
      { n: 2, title: 'Nombre', desc: 'Nombre del usuario.',
        loc: p => dlg(p).locator('input[type=text]').first(), ax: 0, dx: 12 },
      { n: 3, title: 'Email', desc: 'Con el que va a iniciar sesión.',
        loc: p => dlg(p).locator('input[type=email]').first(), ax: 0, dx: 12 },
      { n: 4, title: 'Contraseña', desc: 'Mínimo 6 caracteres.',
        loc: p => dlg(p).locator('input[type=password]').first(), ax: 0, dx: 12 },
      { n: 5, title: 'Rol', desc: 'Administrativo o Socio.',
        loc: p => dlg(p).locator('[role=combobox]').first(), ax: 0, dx: 12 },
      { n: 6, title: 'Crear usuario', desc: 'Da de alta la cuenta.',
        loc: p => dlg(p).getByRole('button', { name: /crear usuario/i }).last(), ax: 0, dx: 14 },
    ],
  },
]
