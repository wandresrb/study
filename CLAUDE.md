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
`bun run verificar:drills [track]` ejecuta la `solucion` de cada `<Drill>` interactivo contra un
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
- **Progreso y SRS** en `lib/vim/progreso.ts` (localStorage `nvdios:v1`): dominio ○/✓/★ por drill,
  racha, y cola de repaso 1/3/7/21 días que consume **`/neovim/dojo/`**. Completar todos los
  drills de una página marca la lección como leída en el sistema de `lib/progress.ts`.
- **Diagramas**: Mermaid está siendo sustituido por familias de componentes (`Pipeline`, `ModeMap`,
  `KeyboardMap` — registradas en `guide/[...slug].astro` y en el linter). `ModeMap` es la máquina
  de modos que responde a teclas reales. Mermaid sigue siendo válido en tracks no migrados.
- En las lecciones, `[` y `]` navegan anterior/siguiente (salvo con el foco en un input o un drill). `bun run check` (`astro check`) cubre los 73 ficheros de
código y hoy está **limpio: 0 errores, 0 warnings, 0 hints**. Ese cero es el listón; si tu cambio
añade un hint, quítalo antes de seguir. `bun run lint:contenido [track]` cubre las ~5.100
lecciones en segundos: frontmatter, `subject` contra la carpeta, `posicion` contra `level.order`,
numeración sin huecos ni duplicados y componentes sin registrar en `guide/[...slug].astro` —que no
dan error, salen como texto en la página—. Los `throw` de `src/data/contenido.ts` siguen saliendo
solo en `bun run build`.

El linter distingue **errores** (0 hoy, y así debe quedarse) de **avisos** (27 hoy, y son
esperados): niveles declarados en `_niveles.json` que todavía no tienen lecciones —lua llega al 29—
y seis `ontologia.mdx` con `posicion: "0"` en vez de `"0.1"`. No los «arregles» de paso: son estado
del contenido, no del código.

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
Estudios · Ciencias de la Computación**, en `/cs/`. Hoy hay 58 tracks declarados, 28 con contenido,
en 11 categorías. Todo sale de content collections; **no hay ningún fichero TS con la lista de
temas** (`src/data/tracks.ts` ya no existe).

«Nivel Dios» es el nombre del **último nivel** de un temario, no del sitio. Está en el `_niveles.json`
de casi todos los temarios (kernel y rust usan «PhD»), y de ahí lo lee la portada del track. No lo
uses como marca ni lo repongas en el chrome: ese fue justo el problema que se corrigió.

### Las cinco colecciones (`src/content.config.ts`)

```
categorias  ←—— tracks  ←—— guia          (una lección pertenece a un track)
                    ↑—— niveles           (el temario del track, _niveles.json)
                    ↑—— cheatsheets       (su referencia rápida)
```

- `categorias/*.json` — agrupación del hub. `plano: 'nucleo' | 'aplicaciones'` decide la pestaña.
- `tracks/*.json` — nombre, colores, `estado: disponible | proximamente`, `categoria` (referencia),
  `ref` (páginas sueltas) y `extras` (bloques promocionales de su portada).
- `guia/**/*.mdx` — las lecciones. El id de la entrada es la ruta relativa, y **cada track vive en su
  carpeta** (`guia/<track>/`). Sin excepciones: neovim estaba en la raíz por herencia y se movió.
- `niveles` — se carga desde `**/_niveles.json` dentro de `guia/`, con `generateId` que convierte la
  carpeta en id de track.
- `cheatsheets/*.json` — categorías de atajos; el enlace existe si existe la entrada, no se declara.

Convenciones que el esquema impone y conviene no romper:

- El frontmatter de una lección exige `subject` (referencia al track), `level`, `order` y `posicion`
  —la posición dentro del nivel: `"17"`, `"17.5"`—. Se llamaba `icon` y nunca contuvo un icono; el
  renombrado tocó los ficheros de una vez para no arrastrar el nombre falso.
- `subject` se declara siempre y explícito (nada de `.default()`: en Zod 4 el default se aplica al
  valor de salida y colaba una cadena donde se esperaba `{ collection, id }`).
- El contenido nunca nombra un icono ni un color de librería. Ver «Iconos».
- `getCollection` no garantiza orden: el orden va en los datos (`orden`, `level`, `order`).

### Consultas: `src/data/contenido.ts`

Único acceso a las colecciones desde las páginas. No guarda datos, calcula lo derivable: color y
cifra de cada nivel (paleta cíclica), agrupación del mapa por plano, minutos/horas desde `duracion`.
Falla ruidosamente a propósito (`getTrack`, `getNiveles` lanzan) porque un dato ausente reaparecía
como `undefined` a tres capas de distancia. `leccionesDe()` está memoizada: se llama ~10.000 veces
por build.

`Plano` no repite la lista de planos, la deriva: `Categoria['data']['plano']`, o sea el `z.enum` de
`content.config.ts`. Como `getMapa()` devuelve un `Record<Plano, …>`, añadir un plano al esquema
rompe su `return` hasta que alguien lo trate — que es lo que no pasó cuando existía un `entorno`
fantasma que nadie pintaba.

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
track entero (todas sus hermanas, el `_niveles.json` y el JSON del track). Hace falta porque la
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
nuevo hay que registrarlo ahí o el MDX no lo ve** (y no da error: sale como texto). El nombre con el
que se escribe en el MDX es español y el fichero es inglés, así que no se deducen el uno del otro:

| en el MDX | fichero |
| --- | --- |
| `Objetivos` | `content/Goals.astro` |
| `Reto` | `content/Challenge.astro` |
| `Paso` | `content/Step.astro` |
| `Instalar` | `content/Install.astro` |
| `Callout`, `KeyCap`/`Kbd`, `Mermaid`, `Cards`/`Card`, `PluginCard`, `Lead`, `Drill` | igual |

`scripts/lint-contenido.mjs` lleva esa lista en `COMPONENTES` **con los nombres del MDX**: si
registras uno nuevo, añádelo también ahí.

### Iconos: Lucide, importado por nombre

El contenido solo lleva su `id`; con qué se dibuja se decide en la página, con **imports directos**
de `@lucide/astro/icons/<nombre>` (nada de barriles, glob ni cadenas convertidas a componente en
render). Existía un `lucide:cpu` dentro de los JSON y un renombrado de Lucide obligaba a editar
contenido.

La correspondencia track → icono vive en **`src/lib/icons.ts` y en ningún otro sitio**: un `import`
por icono y un `TRACK_ICON` de 58 entradas, una por track. Va en `lib/` y no en `components/` porque
no es un componente y ahí solo hay `.astro`/`.tsx`; no hay pega técnica porque los iconos de Lucide
ya son `.ts`.

Se accede por `iconOf(trackId)`, que **lanza** si falta la entrada, diciendo el track y el fichero.
Es el patrón de `getTrack`/`getNiveles`: sin él, un track sin icono daba «Unable to render Icon», que
no dice cuál. El `import type { AstroComponent } from '@lucide/astro'` de la cabecera parece un
barril y no lo es — se borra en compilación—; los iconos siguen entrando uno a uno por su ruta.

La red de verdad, sin embargo, es `lint:contenido`: cruza las claves del mapa contra
`src/content/tracks/*.json` **en las dos direcciones**, así que caza tanto el track sin icono —en
segundos, en vez de con un build de ~5.100 páginas— como la clave huérfana, que el build no ve nunca
porque solo falla en la otra dirección (había una, `local-first-patron`).

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
src/lib/board/        el motor Three.js (~2.450 líneas en 14 módulos). Solo lo carga
                      un import dinámico desde scroll.ts, cuando la capa se acerca.
src/lib/escena.ts     el contrato entre motor y página: Escena, Montar y FIN.
src/portada/          el pegamento: estado.ts (señales), guion.ts (los números),
                      programa.ts (el snippet Rust + la salida), scroll.ts.
src/components/home/Layer.astro   la pantalla anclada y su recorrido.
```

`FIN` (0.72) está en `lib/escena.ts` a propósito: el motor reparte sus fases con él y la página
calcula con él los saltos de teclado. Si divergen, los saltos caen mal. Estuvo escrito tres veces.

Dos islas Solid, `home/Console.tsx` y `home/Stack.tsx`, comparten estado por señales de módulo en
`portada/estado.ts` — sin contexto ni props cruzadas. El código de la consola se resalta **en el
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

1. `src/content/tracks/<id>.json` — con `categoria` apuntando a una categoría existente y
   `estado: 'proximamente'` hasta que tenga lecciones.
2. `src/content/guia/<id>/_niveles.json` — el temario.
3. `src/content/guia/<id>/*.mdx` — lecciones con `subject: <id>`, `level`, `order`, `posicion`.
4. Su icono en `TRACK_ICON` (`src/lib/icons.ts`), con su `import` de
   `@lucide/astro/icons/<nombre>`. Sin esto falla el linter, y el render lanza.
5. Opcional: `src/content/cheatsheets/<id>.json` (el enlace aparece solo).

Hub, sidebar y portada del track se generan a partir de eso. Comprueba con `bun run lint:contenido <id>`.

## Estilo

El código va **en inglés**: identificadores, comentarios, nombres de fichero, los `id` de
elementos, clases propias y anclas (`#path`, no `#camino`), **y las rutas** (`/concepts/`, no
`/conceptos/`). En español van solo la UI y el contenido — es un sitio en español, no un código en
español. Las rutas viejas en español (`/guia/`, `/resources/`) son legado: se migran con redirects
cuando se decida, no de tapadillo. La migración de código está a medias: `src/lib/board/`,
`src/portada/`, `src/lib/icons.ts` y `src/lib/escena.ts` siguen en español; al tocarlos, migra
hacia el inglés, nunca al revés. Los mensajes de commit también en inglés (`feat(track): …`,
`fix(neovim): …`), **de una línea: sin cuerpo narrativo y sin coautorías** — el historial no es un
diario.

**Comentarios: cortos.** Una o dos líneas, y solo cuando explican un *por qué* que no se deduce del
código (una decisión contraintuitiva, una restricción de Astro, una colisión conocida). El repo
arrastra bloques de veinte líneas contando la historia de cada refactor: eso es deuda, no ejemplo a
seguir. No narres lo que el código ya dice, no dejes constancia de lo que había antes, y si tocas
algo que un comentario justifica, corrige el comentario en vez de dejarlo mintiendo — varios ya
mentían (el de Preflight decía lo contrario de lo que hacía el `@import`).
