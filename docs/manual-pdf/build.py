"""Arma docs/Manual-de-uso.pdf a partir de docs/manual-cliente.md y sus capturas.

    python build.py                  -> escribe ../Manual-de-uso.pdf
    python build.py --out otro.pdf   -> lo escribe en otro lado

Reproduce el formato del PDF original: A4 apaisado y familia Helvetica (fuente estándar del
PDF, no se embebe nada), de modo que corre igual en cualquier máquina.

Las capturas las genera aparte ../screenshots-gen. El orden natural es:
regenerar capturas -> correr esto.
"""
import argparse
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer,
    Table, TableStyle,
)

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent
MD = DOCS / "manual-cliente.md"

PAGE = landscape(A4)
MARGIN = 15 * mm
TARGET_DPI = 150        # resolución a la que se guardan las capturas dentro del PDF
BODY_W = PAGE[0] - 2 * MARGIN
BODY_H = PAGE[1] - 2 * MARGIN

INK = colors.HexColor("#2B2B2B")
MUTED = colors.HexColor("#5A6470")
ACCENT = colors.HexColor("#B5623C")   # terracota del isotipo
QUOTE_BG = colors.HexColor("#F6EFE8")

# Helvetica cubre WinAnsi; el único carácter del manual que queda afuera es la flecha.
UNSUPPORTED = {"→": "»"}


# --------------------------------------------------------------------------- estilos
def build_styles():
    ss = getSampleStyleSheet()
    base = dict(fontName="Helvetica", textColor=INK, leading=15)
    return {
        "title": ParagraphStyle("title", ss["Normal"], fontName="Helvetica-Bold",
                                fontSize=26, leading=31, textColor=ACCENT, spaceAfter=10),
        "h2": ParagraphStyle("h2", ss["Normal"], fontName="Helvetica-Bold", fontSize=17,
                             leading=21, textColor=ACCENT, spaceBefore=4, spaceAfter=8),
        "h3": ParagraphStyle("h3", ss["Normal"], fontName="Helvetica-Bold", fontSize=13,
                             leading=17, textColor=INK, spaceBefore=10, spaceAfter=6),
        "body": ParagraphStyle("body", ss["Normal"], fontSize=10.5, spaceAfter=6,
                               alignment=TA_JUSTIFY, **base),
        "li": ParagraphStyle("li", ss["Normal"], fontSize=10.5, spaceAfter=3,
                             leftIndent=14, bulletIndent=3, **base),
        "li2": ParagraphStyle("li2", ss["Normal"], fontSize=10.5, spaceAfter=3,
                              leftIndent=30, bulletIndent=19, **base),
        "quote": ParagraphStyle("quote", ss["Normal"], fontSize=10.5, textColor=MUTED,
                                fontName="Helvetica-Oblique", leading=15),
        "foot": ParagraphStyle("foot", ss["Normal"], fontName="Helvetica", fontSize=8,
                               textColor=MUTED),
    }


# --------------------------------------------------------------------------- inline
def inline(text):
    """Markdown inline -> marcado de ReportLab."""
    for bad, good in UNSUPPORTED.items():
        text = text.replace(bad, good)
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"`([^`]+?)`", r'<font face="Courier">\1</font>', text)
    return text


def for_print(src, cache):
    """Remuestrea la captura a resolución de impresión.

    A tamaño de página una captura ocupa ~760 pt de ancho; guardarla a 2550 px la deja en
    ~240 dpi y engorda el PDF sin que se note. TARGET_DPI la baja a algo razonable.
    """
    from PIL import Image as PILImage
    im = PILImage.open(src)
    max_w = int(BODY_W / 72 * TARGET_DPI)
    if im.width <= max_w:
        return src
    out = cache / src.name
    h = round(im.height * max_w / im.width)
    im.convert("RGB").resize((max_w, h), PILImage.LANCZOS).save(out, "PNG", optimize=True)
    return out


def picture(src, cache):
    """Escala la captura para que entre a lo ancho sin pasarse de alto."""
    from reportlab.lib.utils import ImageReader
    src = for_print(src, cache)
    w, h = ImageReader(str(src)).getSize()
    tw = BODY_W
    th = tw * h / w
    cap = BODY_H - 90        # deja lugar para el título de la sección
    if th > cap:
        th, tw = cap, cap * w / h
    img = Image(str(src), width=tw, height=th)
    img.hAlign = "CENTER"
    return img


def blockquote(text, st):
    t = Table([[Paragraph(inline(text), st["quote"])]], colWidths=[BODY_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), QUOTE_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


# --------------------------------------------------------------------------- parseo
def parse(md):
    """Markdown -> lista de bloques (kind, payload). Une las líneas de un mismo párrafo."""
    blocks, buf, kind = [], [], None

    def flush():
        nonlocal buf, kind
        if buf:
            blocks.append((kind, " ".join(buf).strip()))
            buf, kind = [], None

    for raw in md.splitlines():
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            flush()
            continue
        if stripped == "---":
            flush()
            blocks.append(("break", None))
            continue

        m = re.match(r"^(#{1,3})\s+(.*)$", stripped)
        if m:
            flush()
            blocks.append(({1: "title", 2: "h2", 3: "h3"}[len(m.group(1))], m.group(2)))
            continue

        m = re.match(r"^!\[[^\]]*\]\(([^)]+)\)$", stripped)
        if m:
            flush()
            blocks.append(("img", m.group(1)))
            continue

        # Una línea indentada que no abre viñeta es continuación de la anterior.
        indented = line.startswith("  ") and not re.match(r"^\s*[-*]\s", line)
        if indented and buf:
            buf.append(stripped)
            continue

        m = re.match(r"^([-*])\s+(.*)$", stripped)
        if m:
            lvl2 = len(line) - len(line.lstrip())
            flush()
            kind = "li2" if lvl2 >= 2 else "li"
            buf = [m.group(2)]
            continue

        m = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        if m:
            flush()
            blocks.append(("ol", (m.group(1), m.group(2))))
            continue

        m = re.match(r"^>\s?(.*)$", stripped)
        if m:
            if kind == "quote":
                buf.append(m.group(1))
            else:
                flush()
                kind, buf = "quote", [m.group(1)]
            continue

        if kind in (None, "p"):
            kind = "p"
            buf.append(stripped)
        else:
            buf.append(stripped)

    flush()
    return blocks


# --------------------------------------------------------------------------- salida
def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, MARGIN * 0.55, "Residencia — Manual de uso")
    canvas.drawRightString(PAGE[0] - MARGIN, MARGIN * 0.55, str(canvas.getPageNumber()))
    canvas.restoreState()


def build(out):
    import tempfile
    st = build_styles()
    blocks = parse(MD.read_text(encoding="utf-8"))
    story, missing = [], []
    tmp = tempfile.TemporaryDirectory(prefix="manual-pdf-")
    cache = Path(tmp.name)

    for i, (kind, payload) in enumerate(blocks):
        if kind == "break":
            # Un "---" separa secciones: si abre una nueva (con título), va a página nueva;
            # si solo precede texto suelto —el cierre del manual— alcanza con una línea.
            nxt = blocks[i + 1][0] if i + 1 < len(blocks) else None
            if nxt in ("title", "h2", "h3"):
                story.append(PageBreak())
            elif nxt is not None:
                story.append(Spacer(1, 10))
                story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#D8D2CC")))
                story.append(Spacer(1, 10))
        elif kind in ("title", "h2", "h3"):
            story.append(Paragraph(inline(payload), st[kind]))
        elif kind == "p":
            story.append(Paragraph(inline(payload), st["body"]))
        elif kind in ("li", "li2"):
            story.append(Paragraph(inline(payload), st[kind],
                                   bulletText="•" if kind == "li" else "–"))
        elif kind == "ol":
            n, text = payload
            story.append(Paragraph(inline(text), st["li"], bulletText=f"{n}."))
        elif kind == "quote":
            story.append(Spacer(1, 4))
            story.append(blockquote(payload, st))
            story.append(Spacer(1, 6))
        elif kind == "img":
            src = (DOCS / payload).resolve()
            if not src.exists():
                missing.append(payload)
                continue
            img = picture(src, cache)
            story.append(Spacer(1, 2))
            # La captura viaja junto al encabezado que la presenta.
            prev = story[-3] if len(story) >= 3 else None
            if isinstance(prev, Paragraph) and prev.style.name in ("h2", "h3"):
                story[-3:] = [KeepTogether(story[-3:] + [img])]
            else:
                story.append(img)
            story.append(Spacer(1, 8))

    if missing:
        raise SystemExit("Faltan capturas:\n  " + "\n  ".join(missing))

    doc = SimpleDocTemplate(
        str(out), pagesize=PAGE,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
        title="Manual de uso", author="Residencia", subject="Manual de uso del sistema",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return doc.page


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(DOCS / "Manual-de-uso.pdf"))
    a = ap.parse_args()
    out = Path(a.out).resolve()
    pages = build(out)
    print(f"OK  {out}  ({pages} paginas, {out.stat().st_size / 1024:.0f} KB)")
