# Plan: la ruta de Neovim, de texto a experiencia interactiva

Auditoría de la ruta actual, referentes estudiados, y el plan por fases.

---

# Parte I · Diagnóstico de lo que hay

## Inventario de interactividad real

Medido sobre las 138 lecciones del track:

| Componente | Usos | Interactividad real |
|---|---|---|
| `Callout` | 466 | ninguna: caja de texto |
| `KeyCap` | 223 | ninguna: estilo visual |
| `Reto` | 138 | ninguna: lista de pasos que el lector hace (o no) en su terminal |
| `Mermaid` | 118 | ninguna: SVG estático generado, estética genérica |
| `Drill` | 108 | **un accordion**: "ver solución" despliega texto |
| `Cards` | 96 | ninguna |

**Conclusión: la interactividad de la ruta es cero.** El único componente que sugiere práctica (`Drill`) es un spoiler colapsable. Todo el aprendizaje real ocurre fuera del sitio, en el terminal del lector, sin verificación, sin feedback y sin registro.

## Los tres problemas, en orden de gravedad

1. **No se practica dentro del sitio.** El curso enseña un skill motor (teclear comandos) con el medio de un ensayo. Es como enseñar piano por PDF. La evidencia (Koedinger, CMU: *doing is ~6x better than watching per unit of time*) dice que esto desperdicia la mayor parte del esfuerzo invertido en el contenido.
2. **Los 118 Mermaid son el punto visual más débil.** Layout automático no controlable, sin animación, sin tema propio, sin interacción. Ningún sitio didáctico de referencia usa Mermaid (Comeau: componentes SVG a medida; Ciechanowski: canvas artesanal; learngitbranching: SVG propio).
3. **No hay progreso ni retención.** Nada recuerda qué hiciste, nada te repasa lo que fallaste, nada te dice por dónde vas. Un lector que vuelve a los tres días no tiene dónde continuar.

Lo que SÍ está bien y no se toca: el contenido (en reescritura, niveles 0–2 hechos), la estructura de 27 niveles, la barra lateral con progreso de navegación, la paleta ⌘K, Shiki, el tema Catppuccin.

---

# Parte II · Lo que hacen los referentes (síntesis)

Investigación completa sobre Brilliant, Duolingo, Josh Comeau, Ciechanowski, Execute Program, learngitbranching, vim-adventures, openvim, keybr/monkeytype, Linear/Stripe/Raycast, Coursera. Las cinco conclusiones que gobiernan el plan:

1. **El esqueleto ganador es "estado objetivo + verificación real"** (learngitbranching, Flexbox Froggy, Execute Program): el ejercicio se define como un estado final observable, el usuario ejecuta comandos DE VERDAD, y el sistema compara su resultado contra el objetivo. No es "predict → try → explain" a secas: la verificación automática es lo que sostiene todo.
2. **Cadencia Brilliant**: una interacción cada 2–4 párrafos, y el avance condicionado a tocar. Feedback específico del error cometido, no un "incorrecto" genérico.
3. **Retención programada** (Execute Program, keybr): cola de repaso espaciado sobre lo que TÚ fallaste, con telemetría por comando. Sin esto, los comandos se evaporan en dos semanas.
4. **Una representación visual persistente que evoluciona** (el grafo de learngitbranching, las escenas de Ciechanowski): el mismo modelo mental externo aparece en todo el curso y gana complejidad. Un slider/control = un grado de libertad.
5. **El feel es pedagogía** (Linear/Raycast/monkeytype): latencia cero, teclado-primero, animación de 100–200 ms con propósito. En un curso de un editor teclado-primero, que el curso sea teclado-primero es coherencia, no decoración.

**El hueco de mercado confirmado**: no existe "Execute Program para Vim". vim-adventures gamifica motions pero no es un editor; openvim emula poco y no repasa; VimGolf es para expertos. Drills reales sobre texto real + SRS + verificación es exactamente lo que nadie ha construido.

**Decisión técnica clave (verificada)**: el motor de los drills es **CodeMirror 6 + @replit/codemirror-vim**. Mantenido (Replit lo usa en producción, v6.3.0 reciente), ~70–100 KB gzip, y la emulación cubre lo que el curso necesita: modos (incluido visual block), operadores+mociones con conteos, **text objects** (`ci"`, `da(`, `cit` funcionan de verdad), registros, macros, marcas, `.`, `/`, `f/t`, y `:s`/`:g` con rangos. Extensible (`Vim.defineEx`) para instrumentar ejercicios. Alternativas descartadas: monaco-vim (mismo código vim, editor de varios MB), vim.wasm (muerto desde 2020, SharedArrayBuffer, no instrumentable).

---

# Parte III · El sistema a construir

Seis piezas, ordenadas por impacto. Todo client-side (el sitio es estático en Cloudflare): progreso y SRS en `localStorage`, sin backend, sin login.

## 1. `<VimDrill>` — el corazón

Sustituye al Drill-accordion. Un mini-editor CM6+vim embebido con:

```
ejercicio = {
  doc: "const saludo = 'hola mundo';",   -- buffer inicial
  cursor: [1, 18],                        -- dónde empiezas
  objetivo: "const saludo = '';",         -- buffer final esperado
  pista: 'ci\'',                          -- visible bajo demanda
  presupuesto: 4,                         -- keystrokes de la solución óptima (capa maestría)
}
```

- El usuario teclea Vim real. Un **HUD de keystrokes** (como los overlays de screencast) muestra lo que va pulsando.
- En cada cambio se compara buffer+cursor contra el objetivo → **check con micro-celebración sobria** (200 ms, sin confeti) al conseguirlo.
- Tres niveles de dominio por drill: ✓ correcto → ✓ sin pista → ✓ dentro del presupuesto (VimGolf domesticado, opcional).
- Fallos y tiempos se registran por comando → alimentan el repaso (pieza 5).
- Botón "reset" y "ver solución" (que la ANIMA keystroke a keystroke sobre el buffer, no la muestra como texto).
- Carga perezosa: `client:visible`, módulo CM6 compartido entre todas las instancias de la página.

Los 108 drills existentes ya tienen `reto` y `teclas`: son la semilla. Falta escribirles `doc/cursor/objetivo`, que es trabajo de contenido por drill (~5 min cada uno).

## 2. Sistema de diagramas: 8 familias en vez de 118 Mermaid

Censado el track, los 118 Mermaid caen en familias. Un componente SVG parametrizado por familia, con datos declarativos por uso:

| Familia | Sustituye a | Interacción |
|---|---|---|
| `<BufferView>` | diagramas de "texto antes/después" | **play**: ejecuta los keystrokes con el emulador y anima el resultado |
| `<ModeMap>` | el stateDiagram de modos | pulsa una tecla real → la máquina de estados se ilumina y transiciona |
| `<KeyboardMap>` | tablas de teclas | teclado SVG con teclas resaltadas por capa (normal/insert/operador…) |
| `<CommandAnatomy>` | la "gramática" (verbo+complemento) | piezas que se ensamblan; hover explica cada parte |
| `<TreeView>` | árbol de undo, jumplist, changelist | nodos clicables, el estado se mueve con `u`/`g-` simulados |
| `<WindowLayout>` | splits/tabs/buffers | los `<C-w>` reorganizan el layout en vivo |
| `<Pipeline>` | flowcharts conceptuales (LSP, errorformat, runtimepath) | pasos que se iluminan en secuencia; hover con detalle |
| `<Compare>` | los "una pasada vs dos pasadas" | toggle entre los dos escenarios, animado |

118 diagramas = 8 componentes + 118 bloques de datos de ~10 líneas. Tema Catppuccin nativo, `prefers-reduced-motion` respetado, animación con Motion (o CSS puro donde alcance).

La clave: **`<BufferView>` y `<VimDrill>` comparten motor.** Un diagrama de `ci"` es un drill en modo reproducción. La representación que el alumno ve en los diagramas es la misma sobre la que practica — el patrón learngitbranching.

## 3. Cadencia Brilliant dentro de la lección

Dos componentes ligeros para romper el texto cada 2–4 párrafos:

- `<Predict>`: pregunta con 3–4 opciones cuyos distractores son los errores reales (p. ej. "¿qué borra `dw` con el cursor en la p de puerta?"). Feedback específico por distractor. Después, botón "compruébalo" que abre el mini-buffer.
- `<Reveal>`: tap-to-reveal para los "¿por qué?" (sustituye a algunos Callouts pasivos).

El `<Reto>` final de cada lección pasa de checklist a **secuencia de VimDrills encadenados** con la barra de progreso de la lección.

## 4. El path: progreso visible

- Cada lección declara sus drills; completarlos marca la lección. El `_niveles.json` ya define la estructura → se pinta como **mapa de nodos por nivel** en la portada del track (estado: no visto / en curso / completado / dominado).
- **Checkpoint por nivel**: un set de drills mezclados del nivel entero, sin pistas. Aprobarlo "sella" el nivel.
- Todo en `localStorage` con export/import JSON (sin backend). La barra lateral ya persiste — se le añade el tick por lección.

## 5. Repaso espaciado (la pieza Execute Program)

- Cada drill completado entra en una cola SRS client-side (intervalos 1d/3d/7d/21d; se adelanta si fallaste).
- Página `/neovim/dojo/`: "hoy te tocan estos 12 drills" — mezcla de repasos vencidos + débiles según telemetría (comando con más fallos/lentitud, estilo keybr).
- **Racha honesta**: "N días de práctica", sin culpa, sin fuego. El nivel 6 (Sensei) deja de ser texto sobre práctica deliberada y pasa a SER el dojo.

## 6. Feel: teclado-primero y microinteracciones

- `j`/`k` entre secciones, `]l`/`[l` entre lecciones, `?` abre la cheatsheet flotante, ⌘K ya existe.
- Presupuesto de animación: 100–200 ms, un solo easing global, nada anima si no comunica estado.
- Panel de estadísticas estilo monkeytype en el dojo: precisión y velocidad por comando, comandos débiles. A un público técnico los datos le motivan más que las medallas.

## Lo que NO se hace

Vidas/corazones (el error es el método), gemas/tienda, ligas, mascotas, notificaciones, XP por releer, backend/login, vídeo. Y no se migra ningún otro track hasta que el sistema esté probado en Neovim.

---

# Parte IV · Fases

## Fase 0 · Cimientos (pequeña)
Tokens de movimiento (easing/duraciones), decidir Solid para las islas (ya está en el stack: portada y ⌘K), registro de los componentes nuevos en `guia/[...slug].astro` y en el linter, y el módulo compartido de carga de CM6.

## Fase 1 · El motor (la apuesta)
`<VimDrill>` completo: CM6+vim, verificación, HUD, solución animada, telemetría local. Prototipo en UNA lección (0.4, la gramática) y validación de fidelidad de la emulación con sus drills reales. **Criterio de éxito: `ci"`, `da(`, un conteo y una macro simple funcionan tal cual en el navegador.**

## Fase 2 · Convertir la práctica
Los 108 drills existentes ganan `doc/cursor/objetivo` (trabajo de contenido, lección a lección, empezando por niveles 0–1 ya reescritos). Los `<Reto>` de esas lecciones pasan a secuencias. `<Predict>` entra en las lecciones reescritas con cadencia 2–4 párrafos.

## Fase 3 · Matar Mermaid
Las 8 familias de componentes, migrando por familia (no por lección): primero `<BufferView>` (la más común, comparte motor con la fase 1), luego `<ModeMap>` y `<KeyboardMap>`, después el resto. Mermaid queda solo en los tracks no migrados.

## Fase 4 · Path y dojo
Mapa de nodos, checkpoints por nivel, cola SRS, página del dojo, estadísticas, rachas. El nivel 6 se reescribe alrededor del dojo real.

## Fase 5 · Pulido awwwards
Microinteracciones, sonido opcional (off por defecto), transiciones entre lecciones, revisión de densidad tipográfica, auditoría de latencia percibida.

**Orden de dependencias**: 0 → 1 → 2 y 3 en paralelo → 4 → 5. El contenido (niveles 3–6 pendientes de reescritura) avanza en paralelo desde ya, escribiendo los drills nuevos directamente en el formato de la fase 2.

---

# Parte V · Riesgos

- **Fidelidad de la emulación** — evaluadas las tres vías, la decisión es un híbrido:
  - **Neovim real en el navegador: no existe.** El WASM oficial es una propuesta de GSoC **2026** aún en discusión (libuv no mapea a WASM sin mocks; ver neovim/neovim#35567 y discussions #38033). `vim.wasm` es Vim, muerto desde 2020. Y headless en servidor rompe el sitio estático (infra, latencia, seguridad). Descartado hoy.
  - **Simular la semántica a mano con CSS/HTML: trampa.** Las sutilezas (reglas de `:h exclusive`, `cw`≈`ce`, tipos de registro) son exactamente lo que el curso enseña; una reimplementación propia mentiría donde el texto acierta. codemirror-vim ya es esa reimplementación, con 10 años de batalla.
  - **La vía elegida**: motor codemirror-vim + **piel propia en CSS/HTML** (statusline con modo, ruler, cmdline: se ve como un Neovim de terminal) + **compuertas por lección** (el drill solo acepta teclas ya enseñadas, estilo keybr) + **oráculo en CI**: cada solución se ejecuta en `nvim --headless` real y el buffer resultante se compara con el del emulador; si divergen, el drill se corrige o degrada a reproducción. Fidelidad garantizada drill a drill contra Neovim de verdad, sin cargarlo en el navegador. Y el formato `{doc, cursor, objetivo}` es agnóstico del motor: cuando llegue el WASM oficial, se cambia el motor sin tocar los ejercicios.
  - Los conceptos de plataforma (LSP, ventanas, plugins) se enseñan con las familias de diagramas, no con el emulador.
- **Peso de página**: CM6 solo carga al ver el primer drill (`client:visible`), una instancia de módulo por página. Los diagramas SVG son más ligeros que el Mermaid actual (que hoy descarga el renderer entero).
- **Los otros 27 tracks usan Mermaid**: no se tocan. Los componentes nuevos conviven con Mermaid; la migración de otros tracks es una decisión futura por track.
- **Móvil**: los drills exigen teclado físico. En pantallas táctiles el drill degrada a modo reproducción (ver la solución animada) con aviso honesto.
