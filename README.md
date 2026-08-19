# wandres.dev

**Centro de Estudios · Ciencias de la Computación.** Guías interactivas y profundas, tema a tema, de
los fundamentos a saber aplicarlos. Cada tema ("track") tiene su propio camino por niveles, y el
último de cada temario es el que se gana el nombre de *Nivel Dios*.

Construido con **Astro 7 + MDX** y desplegado como sitio estático en Cloudflare.

Hoy: **68 temas** (29 con contenido, el resto indexados o por escribir), **20 categorías**,
**5088 lecciones** y unas **1512 horas** de estudio.

## 📚 Cómo está organizado

- **`/`** — la portada: una placa que se convierte en el primer piso de una pila. Escena 3D dirigida
  por scroll.
- **`/cs/`** — el centro de estudios. Las categorías se reparten en dos planos: **el núcleo**
  (matemática, ciencias de la computación, sistemas operativos, system design, entorno de trabajo) y
  **las aplicaciones** (los dominios donde se implementa: mobile, frontend, cloud…). Un mismo tema
  aparece en los dos: sistemas distribuidos es concepto y Cloud su despliegue.
- **`/{track}/`** — la portada de cada tema, con su camino de niveles.
- **`/guide/{slug}/`** — cada lección, con barra lateral, índice y paginador.
- **`/{track}/cheatsheet/`** — la referencia rápida del tema, cuando la tiene.
- **`/about/`** — sobre mí.

## 🚀 Cómo arrancarlo

Necesitas **Node.js 24+** (lo declara `engines`; Astro 7 pide al menos 22.12). El gestor de paquetes
es **bun**.

```bash
bun install
bun dev                       # → http://localhost:4321
bun run check                 # astro check sobre los ~100 ficheros de código
bun run lint:content          # las 5088 lecciones, en segundos
bun run build                 # producción en ./dist
bun run preview
bun run deploy                # build + wrangler deploy
```

No hay tests de código. La red son dos comandos: `astro check` para el código y `lint:content` para
el contenido —frontmatter, numeración sin huecos ni duplicados, y componentes de MDX sin registrar,
que no dan error y salen como texto en la página—. El resto de errores de datos los caza el build de
la base: `scripts/build-db.mjs` valida cada lección al insertarla y hace ROLLBACK si algo falla.

El build reconstruye las ~5.100 páginas enteras: el incremental de Astro está apagado hoy
(`experimental.incrementalBuild: false`), aunque las páginas siguen declarando su `cacheKey`. Para
iterar, `bun dev` basta.

## 🗂️ Estructura

La estructura (temas, categorías, niveles, cheatsheets) vive en **SQLite**; la prosa, en **una**
content collection de MDX. La base se genera sola en cada build y en cada cambio de `.mdx` en dev.

```text
nvim-dios/                        (nombre heredado; hoy es un hub multi-tema)
├── astro.config.mjs              # Astro 7 + MDX + Shiki (multi-tema) + KaTeX + fuentes
├── wrangler.jsonc                # Cloudflare: solo assets estáticos, sin Worker
├── db/
│   ├── schema.sql                #   13 tablas: stratum, category, track, level, lesson…
│   ├── seeds/*.sql               #   los datos escritos a mano (01-strata … 07-unlocks)
│   └── catalog.db                #   generada, fuera de git
├── scripts/
│   ├── build-db.mjs              #   arma la base y le inserta las lecciones del frontmatter
│   └── lint-content.mjs          #   el linter de las lecciones
├── src/
│   ├── content.config.ts         # la única colección: las lecciones .mdx (guide)
│   ├── content/guide/<tema>/*.mdx  # un tema por carpeta, sin excepciones
│   ├── integrations/catalog.ts   # corre build-db en el arranque y observa los .mdx en dev
│   ├── data/
│   │   ├── content.ts            #   las consultas sobre la base (SQLite en build, no en el cliente)
│   │   ├── config-neovim/        #   la config de Neovim, en .lua de verdad
│   │   └── resources-neovim.json
│   ├── components/
│   │   ├── content/              #   lo que se usa dentro del MDX
│   │   ├── home/                 #   la portada (islas Solid)
│   │   ├── site/                 #   el armazón: cabecera, pie, barra lateral, ⌘K
│   │   └── ui/                   #   las primitivas: Button, Chip, Tile, Section…
│   ├── layouts/                  # BaseLayout · DocLayout · LandingLayout · GuideLayout
│   ├── pages/                    # las rutas de arriba, sin estilos ni datos dentro
│   │   └── nav/[track].json.ts   #   el índice del track, que la barra lateral pide aparte
│   ├── home/                     # el pegamento de la landing (estado, guion, scroll)
│   ├── lib/
│   │   ├── board/                #   el motor Three.js de la portada
│   │   ├── editor · vim · runtime  # los ejercicios interactivos (CM6, vim, worker de JS)
│   │   ├── learner/              #   el progreso del lector (IndexedDB + SRS)
│   │   ├── icons.ts · themes.ts  #   el mapa track→icono y las tres paletas
│   │   └── mermaid.ts · gossip.ts
│   └── styles/                   # theme · tokens · base · katex · prose (global.css los ordena)
└── public/                       # favicon, robots y _headers
```

`src/data/content.ts` es el único acceso a la base desde las páginas, y calcula lo derivable (color y
cifra de cada nivel, agrupación por estrato, minutos/horas). La base **nunca viaja al cliente**: el
sitio es estático.

## ➕ Añadir un tema nuevo

1. `db/seeds/03-tracks.sql` — una fila en `track`, con `category` apuntando a una categoría existente
   y `status: 'planned'` hasta que tenga lecciones.
2. `db/seeds/04-levels.sql` — el temario: una fila por nivel (PK compuesta `track,idx`).
3. `src/content/guide/<id>/*.mdx` — las lecciones, con `subject: <id>`, `level`, `order` y `position`
   (la posición dentro del nivel: `"3.1"`).
4. Su icono de Lucide en el mapa `TRACK_ICON` de `src/lib/icons.ts` — **obligatorio**: sin él lo
   canta `lint:content` y el render lanza.
5. Opcional: `db/seeds/05-cheatsheets.sql`. El enlace aparece solo si existe la entrada.
6. Pon el track en `status: 'written'` cuando ya se pueda leer, y pasa `bun run lint:content <id>`.

El hub, la barra lateral y la portada del tema se generan solos a partir de esos datos.

## 🎨 Detalles técnicos

- **Diseño**: tres temas conmutables —Kanagawa (el defecto), Catppuccin y Everforest—; las paletas
  viven en `styles/tokens.css` (`:root` y `[data-theme]`). Tailwind v4 (con Preflight, que es el
  único reset del sitio) y daisyUI 5 con prefijo `d-`, sobre esas variables. La migración terminó: no
  queda un solo bloque `<style>` en `src/`, y los tokens —escala tipográfica, radios, sombras,
  medidas de línea en `ch`— viven en `styles/theme.css` y `styles/tokens.css`.
- **Resaltado**: Shiki nativo de Astro, **multi-tema** —emite las tres paletas a la vez y `prose.css`
  elige por `[data-theme]`—, con nombre de archivo y copiar. También el código de la portada se
  resalta en el build: no viaja un resaltador al navegador.
- **Matemática**: `remark-math` + `rehype-katex` la resuelven **en el build** (KaTeX autohospedado);
  una fórmula rota tira el build en vez de publicarse en rojo.
- **Navegación**: `<ClientRouter />` con la barra lateral persistida, prefetch al pasar el ratón y
  paleta de comandos con ⌘K. El índice completo de un tema se pide una vez a `/nav/{track}.json` en
  vez de repetir sus 250 enlaces dentro de cada lección.
- **Interactividad**: JS vanilla para casi todo (filtros, TOC, copiar); la barra lateral en móvil es
  el `drawer` de daisyUI y no lleva script. Los ejercicios de vim montan un Neovim emulado (CodeMirror
  6 + `@replit/codemirror-vim`) y los de código ejecutan en un Web Worker; ambos se cargan al entrar
  en pantalla. Solid solo donde paga: la portada y la paleta de comandos. Three.js para la escena.
- **Diagramas**: Mermaid autohospedado, con `import()` diferido — solo se descarga en las páginas que
  de verdad tienen un diagrama.
- **Fuentes**: Inter + JetBrains Mono, autohospedadas por Astro.
- **Progreso y lectura**: el avance del lector (lecciones, drills y ejercicios, con repaso SRS) vive
  en IndexedDB. En cada lección se puede ajustar el cuerpo del texto y la medida de la línea (en
  caracteres, no en px: la tipografía clásica pide entre 45 y 75, y por defecto van 70); eso y el tema
  se guardan en `localStorage` y se aplican antes de pintar, así que no parpadean.

## 📝 Pendiente

- Porcentaje de avance en el estudio, con objetivos e insignias.
- Un tema claro / sepia (hoy las tres paletas son oscuras).

---

Un tema, un camino, de cero a ∞.
