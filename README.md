# Nivel Dios · Hub de estudio

Un **hub de estudio** con guías interactivas y profundas para dominar tecnología de cero a experto.
Cada tema ("track") tiene su propio camino por niveles, con el mismo diseño y formato.
Construido con **Astro 7 + MDX**.

## 📚 Temas disponibles

- **Neovim** (`/neovim`) — 34 lecciones · 7 niveles. De la filosofía modal a un IDE completo,
  terminal, automatización, IA, LazyVim y un dojo de práctica.
- **Swift & iOS** (`/swift`) — 35 lecciones · 7 niveles. Swift 6.3, SwiftUI, SwiftData,
  concurrencia y publicar en la App Store. Actualizado a Xcode 26 / iOS 26.

La portada (`/`) es el hub donde eliges el tema. Añadir un tema nuevo es cuestión de sumar
sus niveles en `src/data/tracks.ts` y crear sus lecciones en `src/content/guia/<tema>/`.

## 🚀 Cómo arrancarlo

Necesitas **Node.js 20.3+ o 22+**.

```bash
npm install        # o bun install
npm run dev        # o bun dev  → http://localhost:4321
npm run build      # build de producción en ./dist
```

> Si `npm install` se queja de peer dependencies: `npm install --legacy-peer-deps`.

## 🗂️ Estructura

```text
nvim-dios/                        (nombre heredado; hoy es un hub multi-tema)
├── astro.config.mjs              # Astro 7 + MDX + Shiki (catppuccin-mocha)
├── src/
│   ├── data/tracks.ts            # los temas y sus niveles (Neovim, Swift…)
│   ├── content/guia/             # lecciones .mdx
│   │   ├── *.mdx                 #   Neovim (subject por defecto)
│   │   └── swift/*.mdx           #   Swift & iOS (subject: swift)
│   ├── content.config.ts         # colección + campo 'subject'
│   ├── components/               # KeyCap, Callout, Mermaid, Drill, Paso…
│   ├── layouts/                  # BaseLayout, GuideLayout (por tema)
│   ├── pages/
│   │   ├── index.astro           # HUB: elige tema
│   │   ├── [track].astro         # portada de cada tema (/neovim, /swift)
│   │   ├── guia/[...slug].astro  # renderiza cada lección
│   │   ├── cheatsheet · config · recursos   # referencia de Neovim
│   │   └── swift/cheatsheet.astro # referencia de Swift
│   └── styles/global.css         # sistema de diseño (Catppuccin Mocha)
└── public/favicon.svg
```

## ➕ Añadir un tema nuevo

1. Añade el track a `TRACKS` en `src/data/tracks.ts` (nombre, color, niveles).
2. Crea `src/content/guia/<tema>/*.mdx` con frontmatter `subject: <tema>`, `level`, `order`.
3. (Opcional) contenido rico de su portada en `extras` de `src/pages/[track].astro`.

El hub, el sidebar y la portada del tema se generan solos a partir de esos datos.

## 🎨 Detalles técnicos

- **Resaltado**: Shiki nativo de Astro, tema *catppuccin-mocha*, con nombre de archivo y copiar.
- **Diagramas**: Mermaid por CDN (necesita conexión para renderizarse).
- **Fuentes**: Inter + JetBrains Mono.
- **Sin frameworks de UI**: interactividad con JS vanilla (buscador, filtros, TOC, menú móvil).

---

Un tema, un camino, de cero a ∞.
