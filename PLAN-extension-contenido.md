# Plan de extensión de contenido — Neovim · Nivel Dios

Estado actual: **4 niveles · 19 lecciones · ~14.800 palabras**.
Objetivo: **añadir 3 niveles nuevos** (manteniendo 0–3 intactos) que cubran
**más profundidad**, **LazyVim/distribuciones** y **práctica + proyectos**.

---

## Narrativa: ¿qué hay "después de Dios"?

Los niveles 0–3 (Novato → Dios) son el camino para **convertirte** en un dios de Neovim.
Los nuevos 4–6 son el **"más allá"**: mantener el nivel, dominar el editor hasta el último
rincón, y entrenar para siempre. Encaja con la idea de la lección 3.5 ("nunca terminas").

> Los nombres son una **propuesta**: dime si prefieres otros. Mi propuesta:

| Nivel | Nombre | Subtítulo | Color | Icono |
|------|--------|-----------|-------|-------|
| 4 | **Maestro** | Dominio profundo del editor | teal `#94e2d5` | ★ |
| 5 | **Arquitecto** | Distribuciones y LazyVim | amarillo `#f9e2af` | ⌂ |
| 6 | **Sensei** | El Dojo: práctica y proyectos | rosa `#f5c2e7` | 道 |

Alternativas de nombres si prefieres otra vibra: *Titán / Leyenda / Mito*, o
*Maestría / Distros / Dojo*. Tú decides.

---

## NIVEL 4 · Maestro — Dominio profundo del editor
*(bucket "más profundidad": mini-temas que faltan + ampliar lo existente)*

- **4.1 Buffers, ventanas y pestañas a fondo** — el modelo mental buffer≠ventana≠tab, gestión real, `bufferline`, cerrar sin romper el layout.
- **4.2 Plegado (folds)** — manual vs Treesitter vs `nvim-ufo`, atajos `za/zR/zM`, flujos para navegar archivos enormes.
- **4.3 El árbol de deshacer** — `undofile`, `undotree`, ramas de deshacer, recuperar código "perdido".
- **4.4 Quickfix y location list a fondo** — poblar desde grep/LSP/diagnósticos, navegar, `:cdo`/`:cfdo`, edición masiva en proyecto.
- **4.5 Registros y marcas nivel experto** — registros especiales y de expresión, append (`"A`), jumplist/changelist (`Ctrl-o/Ctrl-i`, `g;`), marcas globales.
- **4.6 Búsqueda y reemplazo avanzado** — `very magic`, capturas, `\zs \ze`, `:s` con función Lua, sustitución en todo el proyecto con confirmación.

**Ampliaciones a lecciones existentes** (pequeñas, no nuevas lecciones):
enlazar 4.4 desde 2.4 (debug/quickfix) y 3.3 (automatización); enlazar 4.5 desde 3.3.

## NIVEL 5 · Arquitecto — Distribuciones y LazyVim
*(bucket "LazyVim")*

- **5.1 ¿Distro o desde cero?** — filosofía, cuándo conviene cada una; panorama: kickstart, LazyVim, NvChad, AstroNvim.
- **5.2 LazyVim a fondo** — instalación, estructura de carpetas, el sistema de **Extras**, cómo lee `lua/plugins/`.
- **5.3 Personalizar LazyVim** — override de plugins y opciones, tus keymaps, añadir plugins propios sin romper la distro.
- **5.4 LazyVim para nuestros stacks** — activar los extras de C, Rust, Swift, TypeScript/React y Tailwind (reusa lo del Nivel 2).
- **5.5 Migrar con cabeza** — de tu config a LazyVim (o al revés), el `lazy-lock.json`, y cómo no perder el control.

## NIVEL 6 · Sensei — El Dojo: práctica y proyectos
*(bucket "práctica y proyectos")*

- **6.1 Práctica deliberada** — cómo entrenar de verdad: romper malos hábitos, sin flechas, repetición espaciada, medir progreso.
- **6.2 Vim-golf y drills** — resolver la misma tarea en menos teclas; una colección de retos con solución comentada.
- **6.3 Proyecto guiado de principio a fin** — montar un proyecto real (React + Tailwind, o API en Rust) usando TODO: sesión de zellij, `<leader>ff`, LSP, refactors, git, debug, IA. Paso a paso.
- **6.4 Plan de 30 días** — un calendario de práctica para consolidar del Nivel 0 al Dios.

---

## Componentes nuevos (para la parte práctica)

- **`<Drill>`** — reto de vim-golf: *tarea → teclas → por qué*. Tarjeta con la solución plegable.
- **`<Paso>` / `<Proyecto>`** — pasos numerados para el proyecto guiado (6.3).
- Reutilizamos `<Reto>` y `<Objetivos>` que ya existen.

## Cambios técnicos (bajo el capó)

1. `src/data/niveles.ts` → añadir niveles 4, 5, 6 (nombre, color, icono, tags).
   La **landing** y el **sidebar** se actualizan solos (leen de ahí).
2. 14 lecciones `.mdx` nuevas con su frontmatter (`level`, `order`, …).
3. 1–2 componentes nuevos (`Drill`, `Paso`) + registrarlos en el mapa de `[...slug].astro`.
4. Ampliar el **Cheatsheet** con las categorías nuevas (folds, quickfix, jumplist, registros pro).
5. Validación: compilar cada MDX nuevo con el compilador de MDX (como en la fase anterior).

## Volumen estimado

14 lecciones nuevas ≈ **+11.000–13.000 palabras** (duplica la guía, de 19 a **33 lecciones**).

---

## Orden de ejecución propuesto

1. Estructura: `niveles.ts` + colores + componentes nuevos.
2. Nivel 4 (Maestro) — 6 lecciones.
3. Nivel 5 (Arquitecto/LazyVim) — 5 lecciones.
4. Nivel 6 (Sensei/Dojo) — 4 lecciones.
5. Ampliar Cheatsheet + enlaces cruzados.
6. Validar todo (MDX + .astro) y entregar.

---

### ✅ Lo que necesito de ti para arrancar
- ¿Te valen los **nombres** de nivel (Maestro / Arquitecto / Sensei) o prefieres otros?
- ¿Incluimos **las 14 lecciones** o recortamos alguna?
- ¿El **proyecto guiado** (6.3) lo hacemos con **React/Tailwind** o con **Rust**? (o ambos)
