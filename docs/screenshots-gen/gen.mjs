// Regenera las 10 capturas anotadas de docs/manual-cliente.md desde la app en modo demo.
//
//   node gen.mjs                  -> reemplaza las capturas en docs/screenshots
//   node gen.mjs --out ./tmp      -> las escribe aparte, para revisarlas antes de reemplazar
//   node gen.mjs --only login,caja-> regenera solo las que coincidan
//   node gen.mjs --url http://... -> apunta a otra instancia (por defecto localhost:5174)
//
// Requiere la demo levantada y Google Chrome instalado. Ver README.md.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { SCREENS } from './screens.mjs'
import { buildHtml } from './compose.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const VP = { width: 1600, height: 950 }
const SHOT_DPR = 2      // nitidez de la captura de la app
const OUT_DPR = 1.25    // escala del compuesto final (~2550px de ancho, como los originales)

const argv = process.argv.slice(2)
const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null }
const APP = arg('--url') || process.env.DEMO_URL || 'http://localhost:5174'
const OUT = path.resolve(arg('--out') || path.join(HERE, '..', 'screenshots'))
const ONLY = (arg('--only') || '').split(',').filter(Boolean)

async function login(p) {
  await p.locator('input').nth(0).fill('socio@demo.app')
  await p.locator('input').nth(1).fill('demo1234')
  await p.getByRole('button', { name: /^ingresar$/i }).click()
  await p.waitForURL(/pacientes|huesped/i, { timeout: 20000 })
  await p.waitForTimeout(2000)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
await fs.mkdir(OUT, { recursive: true })
const problems = []

for (const s of SCREENS) {
  if (ONLY.length && !ONLY.some(o => s.file.includes(o))) continue

  const ctx = await browser.newContext({
    viewport: VP, deviceScaleFactor: SHOT_DPR,
    locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires',
  })
  const app = await ctx.newPage()
  await app.goto(APP, { waitUntil: 'networkidle' })

  if (!s.noLogin) await login(app)
  if (s.nav) {
    await app.getByRole('link', { name: s.nav }).click()
    await app.waitForTimeout(2600)
  }
  await s.prep(app)
  // Ajuste solo para la captura (no toca la app): da aire a un diálogo que se queda corto.
  if (s.css) await app.addStyleTag({ content: s.css })
  await app.waitForTimeout(700)

  // --- región a capturar -------------------------------------------------
  let clip = { x: 0, y: 0, width: VP.width, height: VP.height }
  if (s.clip) {
    // El contenido (p. ej. una tabla ancha) puede pintarse fuera de la caja del diálogo:
    // el recorte toma la unión de todo lo que realmente se dibuja.
    const bb = await s.clip(app).evaluate(el => {
      const r = el.getBoundingClientRect()
      let [x0, y0, x1, y1] = [r.left, r.top, r.right, r.bottom]
      el.querySelectorAll('*').forEach(d => {
        const b = d.getBoundingClientRect()
        if (b.width < 1 || b.height < 1) return
        if (getComputedStyle(d).visibility === 'hidden') return
        x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top)
        x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom)
      })
      return { x0, y0, x1, y1, vw: innerWidth, vh: innerHeight }
    })
    const x = Math.max(0, Math.floor(bb.x0))
    const y = Math.max(0, Math.floor(bb.y0))
    clip = {
      x, y,
      width: Math.min(Math.ceil(bb.x1), bb.vw) - x,
      height: Math.min(Math.ceil(bb.y1), bb.vh) - y,
    }
  }

  // --- posición de cada globo -------------------------------------------
  const items = []
  for (const it of s.items) {
    let bb = null
    try { bb = await it.loc(app).first().boundingBox({ timeout: 4000 }) } catch { /* abajo */ }
    if (!bb) { problems.push(`${s.file} · globo ${it.n} (${it.title}): no se encontró el elemento`); continue }
    const ax = it.ax ?? 0, ay = it.ay ?? 0.5
    // El globo nunca debe quedar cortado por el borde de la captura.
    const R = 19
    const clamp = (v, max) => Math.max(R, Math.min(v, max - R))
    items.push({
      n: it.n, title: it.title, desc: it.desc,
      x: clamp(Math.round(bb.x + ax * bb.width + (it.dx ?? 0) - clip.x), clip.width),
      y: clamp(Math.round(bb.y + ay * bb.height + (it.dy ?? 0) - clip.y), clip.height),
    })
  }

  const shot = await app.screenshot({ clip })
  await ctx.close()

  // --- composición: captura + panel de leyendas --------------------------
  const html = buildHtml({
    pngB64: shot.toString('base64'),
    imgW: clip.width, imgH: clip.height,
    title: s.title, items,
  })

  const cctx = await browser.newContext({
    viewport: { width: clip.width + 440, height: clip.height },
    deviceScaleFactor: OUT_DPR,
  })
  const comp = await cctx.newPage()
  await comp.setContent(html, { waitUntil: 'load' })
  await comp.waitForTimeout(350)
  const dest = path.join(OUT, s.file)
  await comp.screenshot({ path: dest, fullPage: true })
  await cctx.close()

  const st = await fs.stat(dest)
  console.log(`OK  ${s.file.padEnd(42)} ${clip.width}x${clip.height} · ${items.length}/${s.items.length} globos · ${(st.size / 1024).toFixed(0)} KB`)
}

await browser.close()

if (problems.length) {
  console.log('\n!! Anclajes sin resolver:')
  problems.forEach(x => console.log('   - ' + x))
  process.exitCode = 1
} else {
  console.log('\nTodos los globos anclados correctamente.')
}
