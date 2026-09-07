# Generador de las capturas del manual

Rehace las 10 imágenes de [`../screenshots/`](../screenshots) que ilustran
[`../manual-cliente.md`](../manual-cliente.md): toma la pantalla de la app en modo demo y le
superpone los globos numerados más el panel de leyendas de la derecha.

Sirve para que las capturas no queden desactualizadas cuando cambia la interfaz: no hay que
recortar ni anotar nada a mano.

## Uso

Con la demo levantada en otra terminal:

```bash
cd frontend && npm run dev -- --port 5174
```

```bash
cd docs/screenshots-gen && npm install && npm run gen
```

Reemplaza las 10 capturas en `docs/screenshots/` conservando los nombres, así los enlaces del
manual siguen funcionando.

Opciones:

| Flag | Para qué |
|------|----------|
| `--out ./tmp` | Escribe en otra carpeta, para revisar antes de reemplazar |
| `--only login,caja` | Regenera solo las que coincidan con esos nombres |
| `--url http://…` | Apunta a otra instancia (por defecto `http://localhost:5174`) |

Necesita **Google Chrome** instalado: Playwright lo usa vía `channel: 'chrome'` y por eso no hace
falta descargar navegadores aparte.

## Cómo está armado

| Archivo | Qué hace |
|---------|----------|
| `screens.mjs` | Las 10 pantallas: cómo llegar a cada una, qué recortar y qué señala cada globo |
| `gen.mjs` | Navega, mide, captura y compone |
| `compose.mjs` | El HTML/CSS del compuesto (captura + panel celeste de leyendas) |

Los globos **no tienen coordenadas fijas**: cada uno se ancla a un elemento real del DOM
(`loc:`) y la posición sale de la caja que devuelve el navegador. Si la interfaz se mueve, el
globo se mueve con ella. `ax`/`ay` eligen el punto de anclaje dentro del elemento (0 = izquierda
o arriba, 1 = derecha o abajo) y `dx`/`dy` lo corren unos píxeles.

Al terminar avisa cuántos globos ancló por pantalla. Si un selector deja de encontrar su
elemento —porque cambió la UI— lo lista al final y termina con código de salida 1, en vez de
dejar el globo en un lugar equivocado sin avisar.

### Datos de la demo

Entra con `socio@demo.app` / `demo1234`. Todos los nombres e importes son ficticios, así que las
capturas se pueden publicar tal cual.

### Retoques solo para la foto

Una pantalla puede declarar `css:` en `screens.mjs`: una hoja de estilos que se inyecta justo
antes de capturar y no toca la app. Es para casos en que la captura necesita otro encuadre, no
para tapar problemas de la interfaz —si algo no entra, conviene arreglar el componente. Hoy no
la usa ninguna pantalla.
