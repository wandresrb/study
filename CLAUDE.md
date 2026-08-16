# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

El gestor de paquetes es **bun** (`bun.lock`; Astro lo autodetecta). Astro 7 pide **Node 22.12+**, y
no hay `engines` en `package.json` que lo avise.

```bash
bun install
bun dev            # http://localhost:4321
bun run build      # ~5.100 páginas
bun run preview
bun run deploy     # astro build && wrangler deploy  → Cloudflare (sitio estático)
```

No hay tests de código; la red son dos comandos — y un oráculo para los drills:
`bun run verify:drills [track]` ejecuta la `solucion` de cada `<Drill>` interactivo contra un
`nvim --headless` real (o `vim --clean` si no hay nvim; `ORACULO_BIN` lo fuerza) y compara el
buffer resultante con `objetivo`. **Un drill no se publica como interactivo si diverge**: o la
solución está mal, o la emulación del navegador no cubre ese comando — en ambos casos se deja
como accordion. La bandera `'tx'` de feedkeys no es opcional: sin la `t`, grabar macros captura
un registro vacío.

## Los drills interactivos y las familias de diagramas

La capa interactiva del track de neovim (plan en `_PLAN-RUTA-INTERACTIVA.md`):

- **`<Drill>`** (`components/content/Drill.astro`) tiene dos formas. Con `doc` + (`objetivo` |
  `objetivoCursor`) monta un **Neovim emulado** (CodeMirror 6 + `@replit/codemirror-vim`) donde el
  lector teclea de verdad; sin ellos cae al accordion clásico. Props: `cursor` `[línea 1-based,
  col 0-based]`, `solucion` en teclas exactas (`ci"adiós<Esc>`), `presupuesto` (pulsaciones de la
  óptima → dominio ★), `preparacion` (teclas ejecutadas al montar, para calentar registros).
  El motor (`lib/vim/drill-engine.ts`, ~90 KB) se carga con `import()` al entrar el primer drill
  en pantalla (`lib/vim/drill-mount.ts`, IntersectionObserver); la piel del terminal se tematiza
  desde JS con `EditorView.theme`, no con CSS global.
- **Progreso y SRS** en `lib/vim/drill-progress.ts` (localStorage `nvdios:v1`): dominio ○/✓/★ por drill,
  racha, y cola de repaso 1/3/7/21 días que consume **`/neovim/recall/`**. Completar todos los
  drills de una página marca la lección como leída en el sistema de `lib/progress.ts`.
- **Diagramas**: Mermaid está siendo sustituido por familias de componentes (`Pipeline`, `ModeMap`,
  `KeyboardMap` — registradas en `guide/[...slug].astro` y en el linter). `ModeMap` es la máquina
  de modos que responde a teclas reales. Mermaid sigue siendo válido en tracks no migrados.
- En las lecciones, `[` y `]` navegan anterior/siguiente (salvo con el foco en un input o un drill).

`bun run check` (`astro check`) cubre los 100 ficheros de código. **El listón es 0 errores,
0 warnings, 0 hints**; si tu cambio añade uno, quítalo antes de seguir. Comprueba el estado *antes*
de empezar: hoy no está en cero por trabajo en vuelo ajeno, y esos no son tuyos.

`bun run lint:content [track]` cubre las 5.088 lecciones en segundos: reconstruye la base,
valida frontmatter, `subject` contra la carpeta, `posicion` contra `level.order`, numeración sin
huecos ni duplicados, componentes sin registrar en `guide/[...slug].astro` —que no dan error, salen
como texto en la página— y `style … fill:#hex` dentro de un `<Mermaid>`. Los `throw` de
`src/data/content.ts` siguen saliendo solo en `bun run build`.

El linter distingue **errores** (0, y así debe quedarse) de **avisos** (65, y son esperados):
niveles declarados en `db/seeds/04-levels.sql` que todavía no tienen lecciones, `ontologia.mdx` con
`posicion: "0"` en vez de `"0.1"`, y la deuda de hex de neovim. No los «arregles» de paso: son
estado del contenido, no del código.

`bun run db` reconstruye `db/catalog.db` a mano (normalmente no hace falta: la integración
`src/integrations/catalog.ts` lo hace sola en cada build y en cada cambio de `.mdx` en dev).
`node scripts/strip-mermaid-hex.mjs [track] [--write]` quita los `style … fill:#hex` de los
diagramas; sin `--write` solo mide.

**El proyecto está fijado a TypeScript 6 a propósito. No lo subas a 7.** TS 7 es el port nativo en
Go y no expone la API JS clásica (`typescript.js`); todo el ecosistema Volar la necesita, así que
con la 7 `astro check` y el LSP del editor mueren en silencio, y `@astrojs/check` declara
`peer: typescript ^5 || ^6`. A cambio no aporta nada: `astro build` no llama a `tsc` en ningún
momento — los tipos los borra rolldown.

El build es caro y **el incremental está apagado** (`experimental.incrementalBuild: false`): hoy
`bun run build` reconstruye las ~5.100 páginas enteras. La maquinaria de `cacheKey` sigue puesta y
hay que mantenerla correcta (ver abajo), pero no la está usando nadie. Para iterar, `bun dev`.
`collectionStorage: 'chunked'` sí está activo: parte el data store de 60 MB en trozos porque
Cloudflare limita el tamaño de un asset suelto.

## Arquitectura

Sitio estático (Astro 7 + MDX). La marca es **wandres.dev**; la sección de estudio es el **Centro de
Estudios · Ciencias de la Computación**, en `/cs/`. Hoy hay **68 tracks declarados, 29 con
contenido, en 20 categorías** y 5.088 lecciones.

«Nivel Dios» es el nombre del **último nivel** de un temario, no del sitio. Está en
`db/seeds/04-levels.sql` para casi todos los temarios (kernel y rust usan «PhD»), y de ahí lo lee la
portada del track. No lo uses como marca ni lo repongas en el chrome: ese fue justo el problema que
se corrigió.

### La estructura vive en SQLite; la prosa, en una content collection

Es lo primero que hay que entender y lo que más ha confundido a las sesiones anteriores: **ya no hay
cinco colecciones**. `src/content/tracks/`, `categorias/`, `cheatsheets/` y los `_niveles.json`
**no existen**. Todo eso es SQL:

```
db/schema.sql        13 tablas: stratum, category, track, level, tag, lesson,
                     teaches, unlocks, cheatsheet(+category,+item), track_feature, track_chip
db/seeds/*.sql       01-strata … 07-unlocks — los datos escritos a mano
db/catalog.db        ~6 MB, generada, fuera de git
```

`src/integrations/catalog.ts` corre `scripts/build-db.mjs` en `astro:config:setup` (y observa los
`.mdx` en dev con debounce de 300 ms), así que la base se reconstruye sola. `build-db` aplica el
esquema, los siete seeds, y luego **inserta las 5.088 lecciones parseando el frontmatter de los
`.mdx`** — la tabla `lesson` no tiene seed. Valida campos obligatorios, que `(subject, level)`
exista, y `PRAGMA foreign_key_check`; si algo falla hace ROLLBACK y el build cae.

`status` de un track es `written | indexed | planned` (no `disponible`/`proximamente`). Un track
`indexed` es **un concepto**: no tiene lecciones propias, pero `teaches` lo enlaza con los niveles
ajenos que ya lo enseñan. Ver `docs/ontology.md`.

La **única colección** que queda (`src/content.config.ts`) es `guia`: `**/*.mdx` con
`retainBody: false`. El id de la entrada es la ruta relativa, y **cada track vive en su carpeta**
(`guia/<track>/`). Sin excepciones: neovim estaba en la raíz por herencia y se movió.

Convenciones que el esquema impone y conviene no romper:

- El frontmatter de una lección exige `subject` (referencia al track), `level`, `order` y `posicion`
  —la posición dentro del nivel: `"17"`, `"17.5"`—. Se llamaba `icon` y nunca contuvo un icono; el
  renombrado tocó los ficheros de una vez para no arrastrar el nombre falso.
- `subject` se declara siempre y explícito (nada de `.default()`: en Zod 4 el default se aplica al
  valor de salida y colaba una cadena donde se esperaba `{ collection, id }`).
- El contenido nunca nombra un icono ni un color de librería. Ver «Iconos».
- `getCollection` no garantiza orden: el orden va en los datos (`orden`, `level`, `order`).

### Consultas: `src/data/content.ts`

Único acceso a la base desde las páginas (`new DatabaseSync(DB_PATH, { readOnly: true })`, con
`DB_PATH` inyectado por `vite.define`). **Es SQLite en build, nunca en el navegador**: el sitio es
estático y la base no viaja al cliente. 22 sentencias preparadas al cargar el módulo.

No guarda datos, calcula lo derivable: color y cifra de cada nivel (paleta cíclica), agrupación del
mapa por estrato, minutos/horas desde `duracion`. Falla ruidosamente a propósito (`getTrack`,
`getLevels` lanzan) porque un dato ausente reaparecía como `undefined` a tres capas de distancia.

Las que importan: `getMap()`, `getTracks()`, `getTrack(id)`, `getLevels(trackId)`,
`lessonsOf(trackId)`, `getTotals()`, `getConcepts()`, `teachingLevels(conceptId)`, y las dos crudas
del grafo — `getTeaches()` (593 aristas concepto→nivel) y `getUnlocks()` (68 track→track).

`src/data/contenido.ts` **ya no existe**: la página que quiera datos importa de `content.ts`. La
excepción es `guide/[...slug].astro`, la única con las dos fuentes: la estructura de SQLite y la
prosa de `getCollection('guia')`.

### Rutas (`src/pages/`)

| Ruta | Fichero | Qué es |
| --- | --- | --- |
| `/` | `index.astro` | Portada 3D: la placa que se convierte en pila |
| `/cs/` | `cs.astro` | El mapa: categorías × tracks, por planos |
| `/{track}/` | `[track].astro` | Portada del track (solo los `disponible`) |
| `/{track}/cheatsheet/` | `[track]/cheatsheet.astro` | Una ruta para las 28 hojas |
| `/guide/{slug}/` | `guide/[...slug].astro` | Cada lección |
| `/nav/{track}.json` | `nav/[track].json.ts` | El índice del track para la barra lateral |
| `/config/`, `/resources/` | sueltas | Referencia de Neovim. Sus datos NO están en la página: la config son ficheros `.lua` reales en `src/data/config-neovim/`, y los enlaces, `src/data/resources-neovim.json` |
| `/about/` | `about.astro` | Sobre mí |

`trailingSlash: 'always'` en `astro.config.mjs`. El único `redirect` que queda es `/cheatsheet`; las
rutas viejas del centro de estudios (`/hub`, `/mapa`) se borraron en vez de mantenerse vivas.

**`/nav/{track}.json`** existe porque la barra lateral emitía sus hasta 250 enlaces dentro de cada
lección. Ahora el HTML solo trae el nivel en curso y el resto se pide una vez por track, con caché de
una hora declarada en `public/_headers` (en salida estática Astro descarta las cabeceras del
`Response` de un endpoint, así que la caché tiene que estar ahí). Lo consumen las dos cosas que
necesitan el índice entero: desplegar un nivel y filtrar por texto.

**`cacheKey` en `guide/[...slug].astro`**: cada lección hashea su propio `digest` *más* una firma del
track entero (todas sus hermanas, más los campos del track y sus niveles leídos de la base). Hace falta porque la
página pinta también el paginador y la cabecera de la barra lateral; con solo el digest propio,
añadir una lección dejaba a las demás restauradas de caché con el paginador viejo. Si tocas lo que
una lección muestra de su track, esa firma tiene que reflejarlo — aunque hoy el incremental esté
apagado.

### Layouts y armazón

Tres, y cuelgan uno de otro. **Ninguna página monta la rejilla a mano.**

| layout | qué monta | quién lo usa |
| --- | --- | --- |
| `BaseLayout` | `<head>`, fuentes, `ClientRouter`, cabecera y pie | los otros dos, y `index.astro` |
| `DocLayout` | el `drawer` de daisyUI + `Sidebar` + la rejilla de contenido | `GuideLayout`, config, recursos, cheatsheet |
| `LandingLayout` | la caja centrada `max-w-sitio` | `[track]`, `404`, `about` |

`DocLayout` es un `d-drawer lg:d-drawer-open`: la barra lateral en móvil la abre y cierra un checkbox
con su `<label>`, **sin una línea de JavaScript** (se llevó por delante `.app`, `.scrim`, `.menu-btn`
y su script). Acepta `ancho` (sin columna derecha), `elemento` (`div`/`article`), `lectura` y una
ranura `aparte` para la columna de la derecha — por ahí le pasa `GuideLayout` su TOC.

Las migas **no** son de `GuideLayout`: `miga` y `buscador` son de la cabecera. `BaseLayout` los
acepta como props y `LandingLayout` los pasa tal cual; `DocLayout` es la excepción —monta su propio
`<Header>` porque va en `armazon="propio"`—, así que acepta `miga` pero fija `buscador` siempre
puesto.

**`lectura`** marca el texto que se lee de arriba abajo (hoy solo las lecciones): estrecha la columna
y saca el control «Aa» (`components/site/ReaderPrefs.astro`). Es la única preferencia de USUARIO del
sitio y por eso lo único que usa `localStorage`. Dos custom properties en `<html>`
—`--lectura-cuerpo` y `--lectura-medida`—, escritas por los botones y repuestas desde un
`<script is:inline>` en el `<head>` de `BaseLayout` para que no parpadeen, más `astro:after-swap`
porque el swap sustituye los atributos de `<html>`.

Las dos las consume `DocLayout` en el mismo elemento, y tiene que ser el mismo: el tamaño con
`text-(length:--lectura-cuerpo)` y la medida con `max-w-[calc(var(--lectura-medida)*1ch)]`. Como el
`ch` se resuelve contra la letra de ese elemento, subir el cuerpo no alarga la línea — sigue
teniendo los caracteres que pida el menú. Por eso el `calc` va en la clase y **no** en un token de
`tokens.css`: allí el `ch` se resolvería contra la letra de `:root` y la medida dejaría de seguir al
cuerpo. El valor guardado es un número pelado (`"70"`), no una longitud.

`max-w-larga` (70ch) se quedó sin usar al conectar la medida; sigue en la escala junto a
`max-w-corta` y `max-w-medida`.

`BaseLayout.astro` recibe `armazon`:

- `normal` — cabecera pegajosa + pie (casi todo);
- `flotante` — cabecera sobre el lienzo, sin pie (solo la portada);
- `propio` — la página trae el suyo (`DocLayout`, con barra lateral).

Lleva `<ClientRouter />`, así que **los módulos de `<script>` se ejecutan una sola vez**: todo lo que
toque el DOM va colgado de `astro:page-load` y debe ser idempotente. Ojo con la barra lateral, que
además usa `transition:persist={`nav-${subject}`}` para conservar scroll y filtro dentro de un mismo
track: **sus nodos sobreviven a la navegación**, así que sus listeners van delegados en `document` y
se registran una vez — recablearlos en `astro:page-load` acumula uno por página visitada.

`GuideLayout.astro` añade la cabecera de lección, el TOC con scroll-spy y el paginador
anterior/siguiente, y arma la miga «CS › track» que pasa hacia abajo.

### Componentes: cuatro carpetas, y los nombres no siempre coinciden

```
components/content/   lo que se usa DENTRO del MDX
components/home/      la portada (Layer.astro, Console.tsx, Stack.tsx, editor.css)
components/site/      el armazón: Header, Footer, Sidebar, Palette, ReaderPrefs, TrackCard,
                      Cheatsheet (el buscador + filtros de la hoja de atajos, todo su JS incluido)
components/ui/        las primitivas: Button, Badge, Chip, Tile, Section, Stat, PageHeader, Accordion
```

Los componentes disponibles dentro del MDX se inyectan desde `guide/[...slug].astro`; **un componente
nuevo hay que registrarlo ahí o el MDX no lo ve** (y no da error: sale como texto).

**Un componente nuevo se nombra en inglés, y sus props también.** Cuatro se escriben en español en
el MDX y son **legado, no precedente**: están en las 5.088 lecciones y renombrarlos costaría tocarlas
todas. Los otros 16 registrados ya están en inglés.

| en el MDX | fichero | |
| --- | --- | --- |
| `Objetivos` | `content/Goals.astro` | legado |
| `Reto` | `content/Challenge.astro` | legado |
| `Paso` | `content/Step.astro` | legado |
| `Instalar` | `content/Install.astro` | legado |
| `Callout`, `KeyCap`/`Kbd`, `Mermaid`, `Cards`/`Card`, `PluginCard`, `Lead`, `Drill`, `Predict`, `Pipeline`, `ModeMap`, `KeyboardMap`, `UndoTree`, `WindowLayout`, `CommandAnatomy` | igual | |

`scripts/lint-content.mjs` lleva esa lista en `COMPONENTS` **con los nombres del MDX**: si
registras uno nuevo, añádelo también ahí.

**Trampa medida: MDX recorta la indentación de una expresión multilínea en un atributo.** Quita
exactamente los espacios con los que está sangrado el atributo —dos, con el formato de siempre—, así
que el código va alineado **con el atributo**, no con el margen:

```mdx
<Run
  code={`function suma(a, b) {
    return a + b;
  }`} />
```

Eso llega como `function suma(a, b) {\n  return a + b;\n}`. Si el cuerpo se escribe a dos espacios
llega pegado al margen. Es cosmético en un diagrama de Mermaid —los 3.586 del sitio perdieron su
sangría y da igual—, pero en `<Run language="python">` **cambia el programa**.

### Iconos: Lucide, importado por nombre

El contenido solo lleva su `id`; con qué se dibuja se decide en la página, con **imports directos**
de `@lucide/astro/icons/<nombre>` (nada de barriles, glob ni cadenas convertidas a componente en
render). Existía un `lucide:cpu` dentro de los JSON y un renombrado de Lucide obligaba a editar
contenido.

La correspondencia track → icono vive en **`src/lib/icons.ts` y en ningún otro sitio**: un `import`
por icono y un `TRACK_ICON` de 68 entradas, una por track. Va en `lib/` y no en `components/` porque
no es un componente y ahí solo hay `.astro`/`.tsx`; no hay pega técnica porque los iconos de Lucide
ya son `.ts`.

Se accede por `iconOf(trackId)`, que **lanza** si falta la entrada, diciendo el track y el fichero.
Es el patrón de `getTrack`/`getLevels`: sin él, un track sin icono daba «Unable to render Icon», que
no dice cuál. El `import type { AstroComponent } from '@lucide/astro'` de la cabecera parece un
barril y no lo es — se borra en compilación—; los iconos siguen entrando uno a uno por su ruta.

La red de verdad, sin embargo, es `lint:content`: cruza las claves del mapa contra la tabla
`track` **en las dos direcciones**, así que caza tanto el track sin icono —en segundos, en vez de
con un build de ~5.100 páginas— como la clave huérfana, que el build no ve nunca porque solo falla
en la otra dirección (había una, `local-first-patron`).

Lo demás del sistema sigue igual:

- El camino de niveles de `[track].astro` **no dibuja iconos**: pinta `n.cifra ?? n.id`, una cifra y
  ya. No importa nada de Lucide (hubo un `LEVEL_ICON` con glifos por nivel; se fue).
- `ui/Chip.astro` es **solo la caja** (placa oscura + aro de degradado); lo que va dentro entra por
  la ranura, y quien llama declara tamaño y `--ico`. `ui/Tile.astro` es la ficha completa —rail de
  color, título, etiquetas— en sus dos formas, `ancha` (camino de niveles, 404) y `compacta` (hub).
- El aspecto de la ficha vive en `@utility chip` (`theme.css`) y no en una cadena de utilidades
  porque sale hasta 59 veces por página: eran 36 KB de nombres de clase en el HTML.

### Estilos: Tailwind v4 + daisyUI, casi sin CSS suelta

La migración terminó: **no hay un solo bloque `<style>` en `src/`**, y `global.css` ya no escribe
CSS, solo ordena cuatro ficheros (el orden importa — todo va sin capa, así que gana lo último):

| fichero | qué hay |
| --- | --- |
| `theme.css` | `@import "tailwindcss"`, el plugin de tipografía, daisyUI y el `@theme inline` |
| `tokens.css` | las variables de `:root`: Catppuccin, roles, anchos, métricas |
| `base.css` | `html`, `body`, fondo, scrollbar, foco |
| `prose.css` | **lo único** que no puede ser una utilidad: el marcado que no emitimos nosotros (Shiki, Mermaid) y el HTML crudo dentro de los `.mdx` |

La única CSS fuera de ese orden es `components/home/editor.css`, que importa `home/Console.tsx`:
numera las líneas del `pre.shiki` de la consola de la portada. Es marcado de Shiki, misma excepción
que `prose.css`, pero vive junto a su isla porque solo la portada lo carga.

Lo que hay que saber para escribir marcado aquí:

1. **Tailwind entero, Preflight incluido** — es el único reset del sitio. Preflight vive en
   `@layer base` y todo lo que hay bajo el `@import` va **sin capa**, así que lo de abajo gana.
2. **`--color-*: initial` borra la paleta por defecto de Tailwind.** Es deliberado —solo existen los
   14 acentos de Catppuccin más `panel`, `borde`, `borde-suave`, `acento`—, pero significa que
   `text-white`, `bg-slate-800` y compañía **no generan ninguna regla y fallan en silencio**: nueve
   `text-white` estuvieron meses sin hacer nada y parecían funcionar porque heredaban `--text`. Si
   una utilidad de color «no hace nada», es esto.
3. **`@theme inline` mapea a las variables, no las copia** (`bg-mantle` **es** `var(--mantle)`). La
   fuente de verdad sigue siendo el `:root` de `tokens.css`.
4. **La escala tipográfica sobrescribe la de Tailwind**: diez pasos, más compactos que el defecto, y
   cada uno trae su interlineado. `text-sm` significa lo del sitio, no lo de Tailwind. Igual con
   radios (cinco), tracking (cuatro) y sombras.
5. **Medidas de línea en `ch`**: `max-w-corta` (44), `max-w-medida` (62), `max-w-larga` (70). Los
   anchos del armazón, en `rem` y con nombre: `max-w-sitio`, `max-w-landing`, `max-w-doc`.
6. **daisyUI 5 con `prefix: "d-"` y `themes: false`.** El prefijo no es cosmético: daisyUI define
   `btn`, `card`, `hero`, `footer`, `stat`… que este sitio ya tenía ocupadas. El tema `catppuccin`
   apunta a las variables de `:root`, no a copias en OKLCH.
7. **Variantes y utilidades propias**: `portada:` y `arrancando:` leen el `data-fase` que la portada
   escribe en `<html>`; `@utility chip`, `@utility emoji` (las fuentes autohospedadas no traen
   emoji: sin `.emoji` sale tofu en Linux) y `@utility prose`, que configura los `--tw-prose-*` con
   los tokens del sitio. Más la familia `nav-*` —`nav-row`, `nav-level`, `nav-lesson`, `nav-num`,
   `nav-num-level`, `nav-title`, `nav-title-level`—: las filas de la barra lateral, por lo mismo que
   `chip`. Aquí hay además una razón dura: las filas que el script inserta desde `/nav/{track}.json`
   salen de clonar el `<template id="nav-item">` de `Sidebar.astro`, así que el aspecto tiene que
   estar en la clase y no en el marcado de cada fila.

El resaltado es Shiki nativo con `catppuccin-mocha` y un transformer que expone `title="archivo"`
como `data-title` —vive en `src/lib/shiki-file-title.ts` porque el componente `<Code>` **no** hereda
los transformers de `markdown.shikiConfig` y hay que pasárselo—. Mermaid está autohospedado
(`src/lib/mermaid.ts`) con `import()` diferido: solo se descarga en las páginas que tienen diagrama.

Deuda pendiente: los colores de track y nivel se inyectan como `style=` uno a uno (`ui/Chip`,
`ui/Tile`, `ui/Badge`, `ui/Button` y `home/Layer` son los cinco sitios que lo hacen) en vez de un
token por contenedor. En el HTML de una lección eso son cientos de atributos.

### La portada

Separada en tres capas, y el motor 3D no vive bajo el nombre de una página:

```
src/lib/board/        el motor Three.js (~2.450 líneas en 15 módulos). Solo lo carga
                      un import dinámico desde scroll.ts, cuando la capa se acerca.
src/lib/scene.ts      el contrato entre motor y página: Scene, Mount y END.
src/home/             el pegamento: state.ts (señales), script.ts (los números),
                      program.ts (el snippet Rust + la salida), scroll.ts.
src/components/home/Layer.astro   la pantalla anclada y su recorrido.
```

`END` (0.72) está en `lib/scene.ts` a propósito: el motor reparte sus fases con él y la página
calcula con él los saltos de teclado. Si divergen, los saltos caen mal. Estuvo escrito tres veces.
(Hoy `board/index.ts` vuelve a declarar `REST = 0.72` en vez de importarlo — es justo lo que el
contrato pide no hacer.)

Renderiza con `three/webgpu` (`WebGPURenderer`, fallback WebGL con `?gl`) y TSL para nodos simples:
**no hay GLSL propio ni postprocesado**. Lo procedural de verdad está en CPU y en 2D — el ruteado de
pistas (`traces.ts`), la siembra de componentes (`seeding.ts`) y el horneado de dos texturas 2048²
en canvas (`mask.ts`). Solo `render.ts`, `environment.ts` y `scene.ts` (151 líneas) son genéricos;
el resto nombra `dimm-a`, `cpuFanout`, `HEADER_PIN_PITCH`.

Dos islas Solid, `home/Console.tsx` y `home/Stack.tsx`, comparten estado por señales de módulo en
`src/home/state.ts` — sin contexto ni props cruzadas. El código de la consola se resalta **en el
build** con `codeToHtml` y viaja como HTML. Solid solo se usa aquí y en `site/Palette.tsx` (⌘K); el
resto del sitio es HTML con JS vanilla colgado de `astro:page-load`.

### Los otros dos lienzos

Aparte del motor 3D hay dos cosas que dibujan y no están en `board/`, y ninguna de las dos se
descubre leyendo `components/`:

- **`src/lib/gossip.ts`** — un campo de nodos que se propagan mensajes, canvas 2D con GSAP. Lo monta
  **solo `about.astro`**, sobre `#gossip-field`. Lee la paleta del `:root` en tiempo de ejecución y
  respeta `prefers-reduced-motion`. Es el único de los tres que se importa en estático, y puede: el
  `<script>` es de esa página y Astro no lo emite en ninguna otra.
- **`src/lib/mermaid.ts`** — autohospedado, con `await import('mermaid')` la primera vez que hay un
  diagrama en la página.

`gossip` devuelve un `destroy()` y `about.astro` lo llama en `astro:before-swap`: sus nodos **no**
llevan `transition:persist`, así que sin eso el `ClientRouter` deja el rAF corriendo sobre un canvas
que ya no está en el documento. Cualquier lienzo nuevo necesita ese par montar/destruir.

### La config de Neovim (`src/data/config-neovim/`)

El árbol de esa carpeta **es** el de `~/.config/nvim`: `init.lua`, `lua/config/*.lua`,
`lua/plugins/*.lua`, `lsp/*.lua`. Son ficheros Lua de verdad, editables con resaltado y diff. La
página los importa con `?raw`; el orden y las notas están en su `index.ts`, declarados a mano porque
el orden es pedagógico, no alfabético. Para tocar la config, edita el `.lua`, no la página.

## Añadir contenido

**Un track nuevo:**

1. `db/seeds/03-tracks.sql` — una fila en `track`, con `category` apuntando a una categoría existente
   y `status: 'planned'` hasta que tenga lecciones.
2. `db/seeds/04-levels.sql` — el temario: una fila por nivel en `level` (PK compuesta `track,idx`).
3. `src/content/guia/<id>/*.mdx` — lecciones con `subject: <id>`, `level`, `order`, `posicion`.
4. Su icono en `TRACK_ICON` (`src/lib/icons.ts`), con su `import` de
   `@lucide/astro/icons/<nombre>`. Sin esto falla el linter, y el render lanza.
5. Opcional: `db/seeds/05-cheatsheets.sql` (el enlace aparece solo).

Hub, sidebar y portada del track se generan a partir de eso. Comprueba con
`bun run lint:content <id>`, que reconstruye la base antes de mirar nada.

## Estilo

El código va **en inglés**: identificadores, **comentarios**, nombres de fichero, los `id` de
elementos, clases propias y anclas (`#path`, no `#camino`), **las rutas** (`/concepts/`, no
`/conceptos/`), **las props de un componente** y **el nombre con el que se escribe en el MDX**. En
español van solo la UI y el contenido — es un sitio en español, no un código en español.

Los comentarios cuentan como código y es donde más se ha reincidido: un comentario nuevo en español
es el mismo error que un identificador en español.

Las rutas viejas en español (`/guia/`, `/resources/`) son legado: se migran con redirects cuando se
decida, no de tapadillo. La migración está a medias — `src/lib/board/`, `src/lib/vim/` y los
componentes de `content/` conservan identificadores y comentarios en español; al tocarlos, migra
hacia el inglés, nunca al revés. Los mensajes de commit también en inglés (`feat(track): …`,
`fix(neovim): …`), **de una línea: sin cuerpo narrativo y sin coautorías** — el historial no es un
diario.

**Comentarios: cortos.** Una o dos líneas, y solo cuando explican un *por qué* que no se deduce del
código (una decisión contraintuitiva, una restricción de Astro, una colisión conocida). El repo
arrastra bloques de veinte líneas contando la historia de cada refactor: eso es deuda, no ejemplo a
seguir. No narres lo que el código ya dice, no dejes constancia de lo que había antes, y si tocas
algo que un comentario justifica, corrige el comentario en vez de dejarlo mintiendo — varios ya
mentían (el de Preflight decía lo contrario de lo que hacía el `@import`).
