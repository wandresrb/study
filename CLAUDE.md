# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

El gestor de paquetes es **bun** (`bun.lock`; Astro lo autodetecta). `package.json` declara
`engines.node: ">=24"` (Astro 7 exige al menos 22.12).

```bash
bun install
bun dev            # http://localhost:4321
bun run build      # ~5.100 páginas
bun run preview
bun run deploy     # astro build && wrangler deploy  → Cloudflare (sitio estático)
```

No hay tests de código; la red son dos comandos — y un oráculo para los drills:
`bun run verify:drills [track]` ejecuta la `solution` de cada `<Exercise>` de vim contra un
`nvim --headless` real (o `vim --clean` si no hay nvim; `ORACLE_BIN` lo fuerza) y compara el
buffer resultante con `goal`. **Un drill no se publica como interactivo si diverge**: o la
solución está mal, o la emulación del navegador no cubre ese comando — en ambos casos se deja
como accordion. La bandera `'tx'` de feedkeys no es opcional: sin la `t`, grabar macros captura
un registro vacío.

El formato y el lint viven en tres herramientas, sin script npm que las envuelva: **oxfmt** formatea
TS/TSX/CSS (`.oxfmtrc.json`, ignora `.mdx`/`.md`), **prettier** los `.astro` (`.prettierrc.json`), y
**biome** es el linter (`biome.json`, con el formatter apagado).

## Los drills interactivos y las familias de diagramas

La capa interactiva del track de neovim:

- **`<Exercise>`** (`components/content/Exercise.astro`) tiene **tres** formas según lo que reciba.
  Con `doc` + (`goal` | `goalCursor`) monta un **Neovim emulado** (CodeMirror 6 +
  `@replit/codemirror-vim`) donde el lector teclea de verdad. Con `code` + `tests` monta un **editor
  que ejecuta** el código en un Web Worker y lo contrasta contra los `tests` —hoy solo corre JS/TS;
  los demás lenguajes salen resaltados y sin botón de ejecutar—. Sin nada de eso cae al accordion
  clásico. Props del vim: `cursor` `[línea 1-based, col 0-based]`, `solution` en teclas exactas
  (`ci"adiós<Esc>`), `budget` (pulsaciones de la óptima → dominio ★), `setup` (teclas al montar, para
  calentar registros).
- **El motor está partido en tres.** `lib/editor/` es el núcleo CM6 compartido (`core`, `languages`,
  `theme`, y el `lazyMount` con IntersectionObserver que difiere el `import()` del motor hasta que el
  ejercicio entra en pantalla); `lib/vim/` es el glue de vim (`engine`, `mount`); `lib/runtime/`
  ejecuta la forma `code` en el worker. La piel del terminal se tematiza desde JS, no con CSS global.
- **Progreso y SRS** en `lib/learner/` (IndexedDB, store `learner`; antes eran dos stores de
  `localStorage` que ni se hablaban): dominio ○/✓/★ por ítem —lección leída, drill practicado,
  ejercicio resuelto—, racha, y cola de repaso 1/3/7/21 días que consume **`/neovim/recall/`**.
  Degrada a no-op sin almacenamiento; las pestañas se enteran por `BroadcastChannel`.
- **Diagramas**: Mermaid está siendo sustituido por familias de componentes (`Pipeline`, `ModeMap`,
  `KeyboardMap` — registradas en `guide/[...slug].astro` y en el linter). `ModeMap` es la máquina
  de modos que responde a teclas reales. Mermaid sigue siendo válido en tracks no migrados.
- En las lecciones, `[` y `]` navegan anterior/siguiente (salvo con el foco en un input o un drill).

`bun run check` (`astro check`) cubre los 101 ficheros de código. **El listón es 0 errores,
0 warnings, 0 hints**; si tu cambio añade uno, quítalo antes de seguir. Comprueba el estado *antes*
de empezar: hoy no está en cero por trabajo en vuelo ajeno, y esos no son tuyos.

`bun run lint:content [track]` cubre las 5.088 lecciones en segundos: reconstruye la base,
valida frontmatter, `subject` contra la carpeta, `position` contra `level.order`, numeración sin
huecos ni duplicados, componentes sin registrar en `guide/[...slug].astro` —que no dan error, salen
como texto en la página—, props que el componente no declara —parsea el `interface Props` de cada
`content/*.astro` para cazar un renombrado a medias— y `style … fill:#hex` dentro de un `<Mermaid>`.
Los `throw` de `src/data/content.ts` siguen saliendo solo en `bun run build`.

El linter distingue **errores** (0, y así debe quedarse) de **avisos** (65, y son esperados):
niveles declarados en `db/seeds/04-levels.sql` que todavía no tienen lecciones, `ontologia.mdx` con
`position: "0"` en vez de `"0.1"`, y la deuda de hex de neovim. No los «arregles» de paso: son
estado del contenido, no del código.

`bun run db` reconstruye `db/catalog.db` a mano (normalmente no hace falta: la integración
`src/integrations/catalog.ts` lo hace sola en cada build y en cada cambio de `.mdx` en dev).
`node scripts/strip-mermaid-hex.mjs [track] [--write]` quita los `style … fill:#hex` de los
diagramas —sin `--write` solo mide— y `node scripts/mermaid-tones.mjs [track] [--write]` repone la
distinción que esos hex codificaban como `class X t-<tono>`, que `prose.css` pinta desde los tokens.

`bun run audit:ux [ruta]` es la auditoría UX/a11y: Playwright (Chromium headless) recorre una página
por arquetipo —o la ruta que le pases— contra `bun dev` (u `AUDIT_BASE`) en dos viewports y mide lo
que un revisor miraría a ojo: contraste AA, tamaños de target, páginas rotas. Los hallazgos son
evidencia, no veredictos.

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

La **única colección** que queda (`src/content.config.ts`) es `guide`: `**/*.mdx` con
`retainBody: false`. El id de la entrada es la ruta relativa, y **cada track vive en su carpeta**
(`src/content/guide/<track>/`). Sin excepciones: neovim estaba en la raíz por herencia y se movió.

Convenciones que el esquema impone y conviene no romper:

- El frontmatter de una lección exige `subject` (referencia al track), `level`, `order` y `position`
  —la posición dentro del nivel: `"17"`, `"17.5"`—. Se llamaba `icon` y nunca contuvo un icono; el
  renombrado tocó los ficheros de una vez para no arrastrar el nombre falso.
- `subject` se declara siempre y explícito (nada de `.default()`: en Zod 4 el default se aplica al
  valor de salida y colaba una cadena donde se esperaba `{ collection, id }`).
- El contenido nunca nombra un icono ni un color de librería. Ver «Iconos».
- `getCollection` no garantiza orden: el orden va en los datos (`level`, `order`, `position`).

### Consultas: `src/data/content.ts`

Único acceso a la base desde las páginas (`new DatabaseSync(DB_PATH, { readOnly: true })`, con
`DB_PATH` inyectado por `vite.define`). **Es SQLite en build, nunca en el navegador**: el sitio es
estático y la base no viaja al cliente. 20 sentencias preparadas al cargar el módulo.

No guarda datos, calcula lo derivable: color y cifra de cada nivel (paleta cíclica), agrupación del
mapa por estrato, minutos/horas desde `duration`. Falla ruidosamente a propósito (`getTrack`,
`getLevels` lanzan) porque un dato ausente reaparecía como `undefined` a tres capas de distancia.

Las que importan: `getMap()`, `getTracks()`, `getTrack(id)`, `getLevels(trackId)`,
`lessonsOf(trackId)`, `getTotals()`, `getConcepts()`, `teachingLevels(conceptId)`, y las dos crudas
del grafo — `getTeaches()` (593 aristas concepto→nivel) y `getUnlocks()` (68 track→track).

`src/data/contenido.ts` **ya no existe**: la página que quiera datos importa de `content.ts`. La
excepción es `guide/[...slug].astro`, la única con las dos fuentes: la estructura de SQLite y la
prosa de `getCollection('guide')`.

### Rutas (`src/pages/`)

| Ruta | Fichero | Qué es |
| --- | --- | --- |
| `/` | `index.astro` | El viaje: 25 estaciones de la placa al navegador |
| `/cs/` | `cs.astro` | El mapa: categorías × tracks, por planos |
| `/{track}/` | `[track].astro` | Portada del track (solo los `written`) |
| `/{track}/cheatsheet/` | `[track]/cheatsheet.astro` | Una ruta para las 28 hojas |
| `/guide/{slug}/` | `guide/[...slug].astro` | Cada lección |
| `/concepts/`, `/concepts/{id}/` | `concepts/index.astro`, `concepts/[concept].astro` | El grafo de conceptos: el listado y, por concepto, los niveles (ajenos) que lo enseñan (`teaches`) |
| `/search/` | `search.astro` | Buscador Pagefind; el prompt `/` del terminal cae aquí como `?q=` |
| `/nav/{track}.json` | `nav/[track].json.ts` | El índice del track para la barra lateral |
| `/idx/*.json` | `idx/{catalog,cheatsheets,graph}.json.ts` | Índices JSON que consume el cliente: catálogo (paleta ⌘K), todos los atajos, y el grafo `teaches`/`unlocks` |
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
y saca el control «Aa» (`components/site/ReaderPrefs.astro`). Es una de las dos preferencias de
USUARIO en `localStorage` —la otra es el tema (`components/site/ThemeSwitch.astro`, tres paletas)—;
el progreso del lector va aparte, en IndexedDB (`lib/learner/`). Dos custom properties en `<html>`
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
components/home/      el viaje (Beat, Board, Chrome + figures/, los 9 arquetipos)
components/site/      el armazón: Header, Footer, Sidebar, Palette, ReaderPrefs, TrackCard,
                      Cheatsheet (el buscador + filtros de la hoja de atajos, todo su JS incluido)
components/ui/        las primitivas: Button, Badge, Chip, Tile, Section, Stat, PageHeader, Accordion
```

Los componentes disponibles dentro del MDX se inyectan desde `guide/[...slug].astro`; **un componente
nuevo hay que registrarlo ahí o el MDX no lo ve** (y no da error: sale como texto).

**Un componente nuevo se nombra en inglés, y sus props también.** Los 20 nombres registrados ya van
en inglés en el MDX: el barrido de renombrado (`Objetivos`→`Goals`, `Reto`→`Challenge`,
`Paso`→`Step`, `Instalar`→`Install`, `Drill`→`Exercise`) tocó las 5.088 lecciones de una vez. La
única deuda que queda son dos props de `Install` (`nota`, `motivo`).

Registrados: `Callout`, `KeyCap`/`Kbd`, `Mermaid`, `Cards`/`Card`, `PluginCard`, `Goals`,
`Challenge`, `Lead`, `Exercise`, `Step`, `Install`, `Predict`, `ModeMap`, `KeyboardMap`, `Pipeline`,
`UndoTree`, `WindowLayout`, `CommandAnatomy`.

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

Las islas Solid usan el paquete hermano, `lucide-solid/icons/<nombre>` — `@lucide/astro` solo emite
componentes Astro. Los emojis que llevan el contenido y los seeds (`<Card icon>`,
`track_feature.icon`, `cheatsheet_category.icon`) son datos, no render: `src/lib/card-icons.ts` los
resuelve a Lucide y quien pinta cae a un icono neutro si falta la entrada. **El sitio no renderiza
ningún emoji ni glifo decorativo de texto** (flechas `→`/`↗` incluidas): siempre un icono de la
librería. La única excepción son las lecciones de Unicode (Swift/Rust/neovim), donde el emoji es la
materia de estudio.

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
CSS, solo ordena cinco ficheros (el orden importa — todo va sin capa, así que gana lo último):

| fichero | qué hay |
| --- | --- |
| `theme.css` | `@import "tailwindcss"`, el plugin de tipografía, daisyUI y el `@theme inline` |
| `tokens.css` | las variables de tema: `:root` es Kanagawa (el defecto) y `[data-theme]` las otras dos (Catppuccin, Everforest); más roles, anchos y métricas |
| `base.css` | `html`, `body`, fondo, scrollbar, foco |
| `katex.css` | el CSS de KaTeX autohospedado (`bun run vendor:katex` lo baja; `verify:katex` comprueba que sigue) |
| `prose.css` | **lo único** que no puede ser una utilidad: el marcado que no emitimos nosotros (Shiki, Mermaid, KaTeX) y el HTML crudo dentro de los `.mdx` |

Ya no hay ninguna CSS fuera de ese orden: la portada dibuja con utilidades y SVG en línea.

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
7. **Utilidades propias**: `@utility chip` y `@utility prose`, que configura los `--tw-prose-*` con
   los tokens del sitio. Más la familia `nav-*` —`nav-row`, `nav-level`, `nav-lesson`, `nav-num`,
   `nav-num-level`, `nav-title`, `nav-title-level`—: las filas de la barra lateral, por lo mismo que
   `chip`. Aquí hay además una razón dura: las filas que el script inserta desde `/nav/{track}.json`
   salen de clonar el `<template id="nav-item">` de `Sidebar.astro`, así que el aspecto tiene que
   estar en la clase y no en el marcado de cada fila.

El resaltado es Shiki nativo, **multi-tema**: emite variables CSS para las tres paletas a la vez
(`SHIKI_THEMES` en `src/lib/themes.ts`, `defaultColor: false`) y `prose.css` elige por `[data-theme]`.
Un transformer expone `title="archivo"` como `data-title` —vive en `src/lib/shiki-file-title.ts`
porque el componente `<Code>` **no** hereda los transformers de `markdown.shikiConfig` y hay que
pasárselo—. La matemática se resuelve **en el build**: `remark-math` + `rehype-katex`
(`throwOnError`, `strict: 'error'`, así una fórmula rota tira el build) salen como HTML de KaTeX, sin
JS en el cliente. Mermaid está autohospedado (`src/lib/mermaid.ts`) con `import()` diferido: solo se
descarga en las páginas que tienen diagrama.

Deuda pendiente: los colores de track y nivel se inyectan como `style=` uno a uno (`ui/Chip`,
`ui/Tile`, `ui/Badge` y `ui/Button` son los cuatro sitios que lo hacen) en vez de un token por
contenedor. En el HTML de una lección eso son cientos de atributos.

### La portada: el viaje

La portada **es** el índice de Computer Science contado de abajo arriba: 25 estaciones agrupadas en
7 capas, de la placa despiezada al navegador que pinta la propia página. No hay islas: HTML servido
en el build más JS vanilla colgado de `astro:page-load`.

```
src/home/journey/     los datos: types.ts (Beat y la unión Figure), beats.ts (las 25
                      estaciones y su prosa), layers.ts (las 7 capas de la pila),
                      tones.ts (el tinte y la geometría que comparten las figuras)
src/home/journey.ts   el controlador: observers, teclado, pila, drills, la cámara
src/home/figures.ts   arma y toca la animación de cada arquetipo (GSAP diferido)
src/home/graph.ts     la constelación del cierre (canvas 2D + el progreso del learner)
src/lib/board/        el motor Three.js (~2.450 líneas en 15 módulos), import dinámico
src/lib/scene.ts      el contrato motor↔página: Scene (advance, start, reset, explode, probe)
src/components/home/  Beat.astro (una estación), Board.astro (el bloque 3D), Chrome.astro
                      (las cuatro esquinas) y figures/ (las láminas y los instrumentos)
```

**Una estación por sección.** Cada beat es un `<section data-beat>` de un viewport con su figura
dentro; el controlador la activa con dos IntersectionObserver (uno «cerca» que la arma, otro
«activa» que la toca). Sin JS o con `prefers-reduced-motion`, las figuras se ven **enteras**: se
sirven en su estado final y solo el controlador las oculta para animarlas. Por eso `armFigure`
esconde con estilos en línea y `clearFigure` los quita — si una figura sale del viewport sin haber
tocado, hay que devolverla entera o se queda invisible.

**Nueve arquetipos, no 25 dibujos.** `flow` (cajas, aristas y un viajero) cubre siete estaciones;
`tree`, `bars`, `cycle`, `morph`, `log` y `circuit` el resto; `reveal` y `graph` son el cierre. Todos
comparten `VIEW` (1000×560), `connect()` para las aristas y `TONE` para el tinte: por eso 25
pantallas se leen como un solo diseño. Una figura nueva se añade al `Figure` de `types.ts`, a su
componente y al switch de `index.astro`.

**El chrome son cuatro esquinas**, nunca un panel: capa y número (arriba izq.), el manifiesto que
se convierte en la pila según se apilan las capas (arriba der.), la pista o el drill (abajo izq.) y
los temarios de esa capa más el CTA (abajo der.). No hay rail de puntos: la pila es la navegación. Los
enlaces son honestos: `written` → `/{id}/`, `indexed` → `/concepts/{id}/`, `planned` sin enlace.

**El bloque 3D** son las estaciones de HARDWARE sobre una escena pegajosa. El scroll del bloque
alimenta `advance(p)` —el recorrido de cámara, 0 a 1— a través de `STOPS`, un reparto por tramos:
cada estación descansa donde su plano cuenta algo (despiece, ensamblaje, y el descenso hasta el
cobre). `explode(1→0)` separa la máquina por capas en Y y es lo que monta la placa a la vista. **No
hay hundimiento al final**: el lienzo pegajoso se va con su propio bloque, y la máquina no se
arranca de cuadro. Los periféricos (`devices.ts`) están fuera de la escena: solo la placa.

Una estación de HARDWARE puede acoplar un **instrumento** en vez de una lámina: `panel` en su
`BoardFigure`, que `Board.astro` pinta dentro de la capa pegajosa y `journey.ts` enciende junto con
el beat. El primero es la sonda (`figures/Probe.astro` + `home/probe.ts`): un osciloscopio con la
punta sobre una pista real de cobre. **La señal es una sola** — `lib/probe-signal.ts` no importa
three, así que el motor la pinta a lo largo del cobre y la página la dibuja en la pantalla desde el
mismo reloj y el mismo `BITS`. El panel se sirve ya dibujado (`penTrace`), así que sin JS o con
`prefers-reduced-motion` la lectura sigue en pie.

Renderiza con `three/webgpu` (`WebGPURenderer`, fallback WebGL con `?gl`) y TSL para nodos simples:
**no hay GLSL propio ni postprocesado**. Lo procedural de verdad está en CPU y en 2D — el ruteado de
pistas (`traces.ts`), la siembra de componentes (`seeding.ts`) y el horneado de dos texturas 2048²
en canvas (`mask.ts`). Solo `render.ts`, `environment.ts` y `scene.ts` son genéricos; el resto nombra
`dimm-a`, `cpuFanout`, `HEADER_PIN_PITCH`.

GSAP entra por `src/home/motion.ts`, el singleton diferido que también usan los vuelos: `loadGsap`,
`loadFlip`, `loadScramble` y `flyToken`. **Un fallo de carga no se cachea** y avisa en dev — el
silencio costó una sesión. Solid ya solo vive en `site/Palette.tsx` (⌘K).

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
3. `src/content/guide/<id>/*.mdx` — lecciones con `subject: <id>`, `level`, `order`, `position`.
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

Las rutas ya están todas en inglés (`/guide/`, `/concepts/`, `/resources/`…); si reaparece una vieja
en español es legado y se migra con redirect, no de tapadillo. La migración del código a inglés está
casi cerrada — `src/lib/` está entero en inglés (incluidos `board/` y `vim/`) y los nombres y props
del MDX también; lo que queda son comentarios sueltos en los componentes de diagrama de neovim
(`ModeMap`, `Predict`, `UndoTree`, `WindowLayout`, `KeyboardMap`) y los dos props de `Install`. Al
tocarlos, migra hacia el inglés, nunca al revés. Los mensajes de commit también en inglés (`feat(track): …`,
`fix(neovim): …`), **de una línea: sin cuerpo narrativo y sin coautorías** — el historial no es un
diario.

**Comentarios: cortos.** Una o dos líneas, y solo cuando explican un *por qué* que no se deduce del
código (una decisión contraintuitiva, una restricción de Astro, una colisión conocida). El repo
arrastra bloques de veinte líneas contando la historia de cada refactor: eso es deuda, no ejemplo a
seguir. No narres lo que el código ya dice, no dejes constancia de lo que había antes, y si tocas
algo que un comentario justifica, corrige el comentario en vez de dejarlo mintiendo — varios ya
mentían (el de Preflight decía lo contrario de lo que hacía el `@import`).
