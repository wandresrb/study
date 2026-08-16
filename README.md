# wandres.dev

**Centro de Estudios · Ciencias de la Computación.** Guías interactivas y profundas, tema a tema, de
los fundamentos a saber aplicarlos. Cada tema ("track") tiene su propio camino por niveles, y el
último de cada temario es el que se gana el nombre de *Nivel Dios*.

Construido con **Astro 7 + MDX** y desplegado como sitio estático en Cloudflare.

Hoy: **58 temas** (28 con contenido, 30 por escribir), **11 categorías**, **5078 lecciones** y unas
**1507 horas** de estudio.

## 📚 Cómo está organizado

- **`/`** — la portada: una placa que se convierte en el primer piso de una pila. Escena 3D dirigida
  por scroll.
- **`/cs/`** — el centro de estudios. Las categorías se reparten en dos planos: **el núcleo**
  (matemática, ciencias de la computación, sistemas operativos, system design, entorno de trabajo) y
  **las aplicaciones** (los dominios donde se implementa: mobile, frontend, cloud…). Un mismo tema
  aparece en los dos: sistemas distribuidos es concepto y Cloud su despliegue.
- **`/{track}/`** — la portada de cada tema, con su camino de niveles.
- **`/guia/{slug}/`** — cada lección, con barra lateral, índice y paginador.
- **`/{track}/cheatsheet/`** — la referencia rápida del tema, cuando la tiene.
- **`/about/`** — sobre mí.

## 🚀 Cómo arrancarlo

Necesitas **Node.js 22.12+** (lo pide Astro 7). El gestor de paquetes es **bun**.

```bash
bun install
bun dev                       # → http://localhost:4321
bun run check                 # astro check sobre los 73 ficheros de código
bun run lint:content        # las 5078 lecciones, en segundos
bun run build                 # producción en ./dist
bun run preview
bun run deploy                # build + wrangler deploy
```

No hay tests. La red son dos comandos: `astro check` para el código y `lint:content` para el
contenido —frontmatter, numeración sin huecos ni duplicados, y componentes de MDX sin registrar, que
no dan error y salen como texto en la página—. El resto de errores de datos los caza el esquema de
las colecciones durante el build.

El build reconstruye las ~5.100 páginas enteras: el incremental de Astro está apagado hoy
(`experimental.incrementalBuild: false`), aunque las páginas siguen declarando su `cacheKey`. Para
iterar, `bun dev` basta.

## 🗂️ Estructura

```text
nvim-dios/                        (nombre heredado; hoy es un hub multi-tema)
├── astro.config.mjs              # Astro 7 + MDX + Shiki + fuentes autohospedadas
├── wrangler.jsonc                # Cloudflare: solo assets estáticos, sin Worker
├── scripts/lint-content.mjs    # el linter de las lecciones
├── src/
│   ├── content.config.ts         # las cinco colecciones y sus relaciones
│   ├── content/
│   │   ├── categorias/*.json     #   las 11 categorías del mapa
│   │   ├── tracks/*.json         #   los 58 temas
│   │   ├── cheatsheets/*.json    #   las referencias rápidas
│   │   └── guia/                 #   las lecciones (.mdx) y el temario (_niveles.json)
│   │       └── <tema>/*.mdx      #     un tema por carpeta, sin excepciones
│   ├── data/
│   │   ├── contenido.ts          #   las consultas sobre las colecciones
│   │   ├── config-neovim/        #   la config de Neovim, en .lua de verdad
│   │   └── recursos-neovim.json
│   ├── components/
│   │   ├── content/              #   lo que se usa dentro del MDX
│   │   ├── home/                 #   la portada
│   │   ├── site/                 #   el armazón: cabecera, pie, barra lateral, ⌘K
│   │   └── ui/                   #   las primitivas: Button, Chip, Tile, Section…
│   ├── layouts/                  # BaseLayout · DocLayout · LandingLayout · GuideLayout
│   ├── pages/                    # las rutas de arriba, sin estilos ni datos dentro
│   │   └── nav/[track].json.ts   #   el índice del track, que la barra lateral pide aparte
│   ├── portada/                  # el pegamento de la landing (estado, guion, scroll)
│   ├── lib/board/                # el motor Three.js
│   └── styles/                   # theme · tokens · base · prose (global.css solo los ordena)
└── public/                       # favicon, robots y _headers
```

Los datos son **content collections**, no ficheros TypeScript: añadir un tema es añadir JSON y MDX.
Las relaciones entre colecciones se declaran con `reference()`, que da tipos y valida la forma.

## ➕ Añadir un tema nuevo

1. `src/content/tracks/<id>.json` — nombre, colores, `orden`, la `categoria` a la que pertenece y
   `estado: "proximamente"` hasta que tenga lecciones.
2. `src/content/guia/<id>/_niveles.json` — el temario: nombre, subtítulo y descripción de cada nivel.
3. `src/content/guia/<id>/*.mdx` — las lecciones, con `subject: <id>`, `level`, `order` y `posicion`
   (la posición dentro del nivel: `"3.1"`).
4. Su icono de Lucide en el mapa `TRACK_ICON` de `src/lib/iconos.ts` — **obligatorio**: sin él lo
   canta `lint:content` y el render lanza.
5. Opcional: `src/content/cheatsheets/<id>.json`. El enlace aparece solo si existe la entrada.
6. Pon el track en `"disponible"` cuando ya se pueda leer, y pasa `bun run lint:content <id>`.

El hub, la barra lateral y la portada del tema se generan solos a partir de esos datos.

## 🎨 Detalles técnicos

- **Diseño**: Catppuccin Mocha, tema oscuro único. Tailwind v4 (con Preflight, que es el único reset
  del sitio) y daisyUI 5 con prefijo `d-`, sobre las variables de siempre. La migración terminó: no
  queda un solo bloque `<style>` en `src/`, y los tokens —escala tipográfica, radios, sombras,
  medidas de línea en `ch`— viven en `styles/theme.css` y `styles/tokens.css`.
- **Resaltado**: Shiki nativo de Astro, tema *catppuccin-mocha*, con nombre de archivo y copiar.
  También el código de la portada se resalta en el build: no viaja un resaltador al navegador.
- **Navegación**: `<ClientRouter />` con la barra lateral persistida, prefetch al pasar el ratón y
  paleta de comandos con ⌘K. El índice completo de un tema se pide una vez a `/nav/{track}.json` en
  vez de repetir sus 250 enlaces dentro de cada lección.
- **Interactividad**: JS vanilla para casi todo (filtros, TOC, copiar); la barra lateral en móvil es
  el `drawer` de daisyUI y no lleva script. Solid solo donde paga: la portada y la paleta de
  comandos. Three.js para la escena de la portada.
- **Diagramas**: Mermaid autohospedado, con `import()` diferido — solo se descarga en las páginas que
  de verdad tienen un diagrama.
- **Fuentes**: Inter + JetBrains Mono, autohospedadas por Astro.
- **Lectura**: en cada lección se puede ajustar el cuerpo del texto y la medida de la línea (en
  caracteres, no en px: la tipografía clásica pide entre 45 y 75, y por defecto van 70). Se guarda
  en `localStorage` y se aplica antes de pintar, así que no parpadea.

## 📝 Pendiente

- Porcentaje de avance en el estudio, con objetivos e insignias.
- Tema claro / sepia en las preferencias de lectura (hoy solo tamaño y ancho).

---

Un tema, un camino, de cero a ∞.
