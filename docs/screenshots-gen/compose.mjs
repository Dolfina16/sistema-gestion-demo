// Builds the annotated composite: app capture on the left, legend panel on the right.
const C = {
  panelBg: '#EDF3F9',
  accent:  '#1565C0',
  ink:     '#17324D',
  muted:   '#5A6470',
}
const PANEL_W = 440
const DOT = 34

export function buildHtml({ pngB64, imgW, imgH, title, items }) {
  const dots = items.map(it => `
    <span class="dot" style="left:${it.x}px; top:${it.y}px">${it.n}</span>`).join('')

  const rows = items.map(it => `
    <li>
      <span class="ldot">${it.n}</span>
      <div class="ltext"><b>${esc(it.title)}</b><span>${esc(it.desc)}</span></div>
    </li>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { display: flex; align-items: stretch; font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
         background: #fff; width: ${imgW + PANEL_W}px; }
  .shot { position: relative; width: ${imgW}px; flex: 0 0 ${imgW}px; background: #fff; }
  .shot img { display: block; width: ${imgW}px; height: ${imgH}px; }
  .dot { position: absolute; transform: translate(-50%, -50%);
         width: ${DOT}px; height: ${DOT}px; border-radius: 50%;
         background: ${C.accent}; border: 3px solid #fff;
         box-shadow: 0 1px 4px rgba(0,0,0,.35);
         color: #fff; font-size: 16px; font-weight: bold; line-height: ${DOT - 6}px;
         text-align: center; }
  .panel { flex: 0 0 ${PANEL_W}px; background: ${C.panelBg}; padding: 26px 24px 30px 26px; }
  .panel h1 { font-size: 26px; color: ${C.ink}; padding-bottom: 12px;
              border-bottom: 3px solid ${C.accent}; margin-bottom: 18px; }
  .panel ul { list-style: none; }
  .panel li { display: flex; gap: 11px; margin-bottom: 15px; align-items: flex-start; }
  .ldot { flex: 0 0 24px; width: 24px; height: 24px; border-radius: 50%; background: ${C.accent};
          color: #fff; font-size: 13px; font-weight: bold; line-height: 24px; text-align: center;
          margin-top: 1px; }
  .ltext { display: flex; flex-direction: column; }
  .ltext b { font-size: 17.5px; color: ${C.ink}; line-height: 1.25; }
  .ltext span { font-size: 15.5px; color: ${C.muted}; line-height: 1.35; margin-top: 2px; }
</style></head><body>
  <div class="shot"><img src="data:image/png;base64,${pngB64}">${dots}</div>
  <div class="panel"><h1>${esc(title)}</h1><ul>${rows}</ul></div>
</body></html>`
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
