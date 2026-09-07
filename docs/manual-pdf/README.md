# Generador del PDF del manual

Arma [`../Manual-de-uso.pdf`](../Manual-de-uso.pdf) a partir de
[`../manual-cliente.md`](../manual-cliente.md) y las capturas de [`../screenshots/`](../screenshots).

El markdown es la única fuente: el PDF se regenera, no se edita a mano.

## Uso

```bash
cd docs/manual-pdf && pip install -r requirements.txt && python build.py
```

Con `--out otro.pdf` lo escribe en otra ruta, para mirarlo antes de reemplazar el que está
publicado.

Si cambió la interfaz, primero se rehacen las capturas
(ver [`../screenshots-gen`](../screenshots-gen)) y después se corre esto.

## Formato

A4 apaisado y familia **Helvetica**, igual que el PDF original. Helvetica es una de las fuentes
estándar del formato PDF, así que no se embebe ningún archivo de fuente: el resultado es idéntico
en cualquier máquina y no hay licencias de tipografía de por medio.

Eso trae una limitación: las fuentes estándar usan la codificación WinAnsi, que no cubre todo
Unicode. Del manual, el único carácter afuera es la flecha `→`, que se reemplaza por `»` al
imprimir (tabla `UNSUPPORTED` en `build.py`). Si más adelante se agregan símbolos o emojis al
markdown hay que sumarlos a esa tabla, o pasar a embeber una tipografía completa.

Las capturas se remuestrean a **150 dpi** para el tamaño de página (`TARGET_DPI`). A resolución
original entrarían a ~240 dpi: se ve igual y pesa bastante más.

## Saltos de página

Los `---` del markdown separan secciones. Si después del `---` viene un título, el PDF pasa a
página nueva; si viene texto suelto, se dibuja apenas una línea. Así cada sección abre en su
hoja sin que el cierre del manual se quede solo en la última.
