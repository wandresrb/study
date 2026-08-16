# Estado del árbol — 14 ago 2026

## Verde

```
bun run check            77 ficheros · 0 errores · 0 warnings · 0 hints
bun run lint:content   5.078 lecciones · 28 tracks · 0 errores · 27 avisos
bun run build            5.140 páginas en 52 s
```

Los 27 avisos son los esperados y documentados en CLAUDE.md: niveles declarados en `_niveles.json`
todavía sin lecciones (lua llega al 29) y seis `ontologia.mdx` con `posicion: "0"`. No son deuda de
código.

## Fase 1 del plan: cerrada

El contenido estructural ya no sale de content collections sino de SQLite.

- `db/schema.sql` + `db/seeds/01-strata … 07-unlocks.sql` — en git, editables, con historial.
- `scripts/build-db.mjs` genera `db/catalog.db`: 11 categorías, 58 tracks, 1.046 niveles,
  3.056 etiquetas, **5.078 lecciones**, 620 aristas `teaches`, 28 cheatsheets.
- `db/catalog.db` — generada, ignorada por git (`db/*.db`).
- `src/data/content.ts` — el único acceso desde las páginas. Síncrono (`DatabaseSync`), sentencias
  preparadas, sin memoización: la memoización de `leccionesDe` sobraba.
- `guia` sigue siendo content collection: es lo que renderiza el MDX.

**`/cs/` ganó el tercer grupo** que el plan anunciaba, y sale de la tabla `stratum`, no de una lista
en la página:

| estrato | categorías | fichas |
| --- | --- | --- |
| `concept` — El núcleo | 4 | 1 |
| `implementation` — Las implementaciones | 6 | 26 |
| `tool` — Las herramientas | 1 | 1 |

`entorno-desarrollo` salió del núcleo al estrato de herramientas, como decía `docs/ontology.md` § 5.

## El barrido español → inglés: hecho, con un tope declarado

Los identificadores de código están en inglés: props, variables, funciones, tipos y las claves de
los módulos `.ts`. Cada fichero quedó **entero**, sin mezcla.

Renombrados que conviene conocer porque cambian cómo se llaman los componentes:

| antes | ahora | dónde |
| --- | --- | --- |
| `titulo` / `bajada` | `title` / `lede` | `Section`, `PageHeader`, `Tile` |
| `variante` / `talla` | `variant` / `size` | `Button`, `Badge` |
| `primario\|fantasma\|suave\|enlace` | `primary\|ghost\|soft\|link` | `Button` |
| `neutra\|marca\|suave\|contorno` | `neutral\|brand\|soft\|outline` | `Badge` |
| `forma="ancha\|compacta"` | `shape="wide\|compact"` | `Tile` |
| `etiquetas` / `enc` / `atenuada` | `tags` / `heading` / `dimmed` | `Tile` |
| ranura `glifo` | ranura `glyph` | `Tile` |
| `caja` | `box` | `Chip` |
| `datos` / `valor` / `etiqueta` | `items` / `value` / `label` | `Stat` |
| `armazon="normal\|flotante\|propio"` | `chrome="normal\|floating\|own"` | `BaseLayout` |
| `miga={[{texto}]}` | `crumbs={[{text}]}` | los tres layouts y `Header` |
| `buscador` | `search` | `BaseLayout`, `LandingLayout`, `Header` |
| `ancho` / `elemento` / `lectura` | `full` / `element` / `reading` | `DocLayout` |
| ranura `aparte` | ranura `aside` | `DocLayout` |
| `hoja` | `sheet` | `Cheatsheet` |
| `FICHEROS` / `ruta` / `codigo` / `nota` | `CONFIG_FILES` / `path` / `code` / `note` | `data/config-neovim` |
| `--lectura-cuerpo` / `--lectura-medida` | `--reading-size` / `--reading-measure` | `tokens.css` |
| `lectura:*` en localStorage | `reading:*` | `ReaderPrefs`, `BaseLayout` |

**`as` no sirve como nombre de prop en Astro**: rompe la inferencia de `Astro.props` y el `Props`
sale como «declared but never used», con los parámetros cayendo a `any`. Por eso son `heading` y
`element` y no `as`.

### El tope: lo que se queda en español a propósito

Está escrito dentro de las **5.078 lecciones `.mdx`** y renombrarlo obliga a tocarlas todas:

- los componentes que el MDX invoca: `Objetivos`, `Reto`, `Paso`, `Instalar`;
- sus props: `reto`, `teclas`, `nota`, `motivo`;
- las claves de frontmatter: `subject`, `level`, `order`, `posicion`, `duracion`.

También sigue en español el subsistema de la portada (`src/portada/`, `src/lib/board/`, `Layer.astro`
con `escena`/`codigo`): son ~2.450 líneas en 14 módulos y no las tocó este barrido.

Las claves de `src/data/recursos-neovim.json` (`titulo`, `nombre`) se quedan por lo mismo: son datos,
no código.

## Pendiente

1. **`db/catalog.db` pesa 5,9 MB, no los ~600 KB del plan.** La columna `search` son 1,95 MB de
   copia normalizada de título+descripción; el plan la pide explícitamente, así que se queda, pero
   el presupuesto de la fase 2 (≤ 500 KB brotli) hay que rehacerlo con el número real. Esa medida es
   la que confirma o tumba la decisión de no usar FTS5.
2. **`scripts/build-db.mjs` no corre solo.** No está en los scripts de `package.json` y la
   integración de Astro que el plan pedía no existe: editar una lección deja `catalog.db` viejo y el
   build lo usa sin avisar.
3. **Doble fuente transitoria.** `content.config.ts` aún declara las cinco colecciones y los JSON de
   `tracks/`, `categorias/`, `cheatsheets/` y los `_niveles.json` siguen en el árbol, aunque las
   páginas ya leen del `.db`. El plan los daba por borrados; no tocar hasta decidir si SQLite se
   queda.

Resueltos el 14 por la tarde: `contenido.ts` borrado, `// @ts-check` repuesto, y las 56 líneas de
comentario de los `.lua` recuperadas desde `HEAD:src/pages/config.astro` — el fichero del que se
extrajeron los `.lua` el día 12. Los `.lua` nunca estuvieron en git: el `git checkout` que sugería
la versión anterior de este documento era imposible.

## Fases 2 y 3, sin empezar

El plan completo está en el transcript de la sesión del 14 de agosto:

```
~/.claude/projects/-Users-willy-Documents-Claude-nvim-dios/7ce6cbb3-d139-46e7-bfd1-18b9e8efd62a.jsonl
```

Es el último de los tres `ExitPlanMode`, marca `2026-08-14T16:09:15Z`.

- **Fase 2 — el catálogo en el cliente.** `catalogo-<hash>.db.gz`, worker, `sqlite3_deserialize`,
  Cache API. Reescribir `Palette.tsx`: de 69 destinos a las 5.078 lecciones. Cheatsheets unificadas.
  Al hacerla se borran `src/pages/nav/[track].json.ts` y la regla `/nav/*` de `public/_headers`.
- **Fase 3 — progreso.** IndexedDB como registro de operaciones, `ATTACH`, `BroadcastChannel`,
  y «qué leo ahora» como CTE recursiva sobre `unlocks`.
