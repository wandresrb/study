# La ontología del centro de estudios

Cómo se organiza el contenido, por qué el esquema actual no da abasto y qué lo sustituye.
Es la referencia de dos trabajos: el mapa de `/cs/` y la migración de la estructura a SQLite.

Medido sobre el repo el 14-08-2026: 11 categorías, 58 tracks, 5.078 lecciones.

## 1. El estado medido

```
plano           tracks   escritos   lecciones      %
─────────────────────────────────────────────────────
núcleo            32         2          429      8,4 %
aplicaciones      26        26        4.649     91,6 %
```

Los dos únicos tracks escritos del núcleo son `local-first` (291) y `neovim` (138). Quitadas
las dos categorías que no son núcleo —ver §3—, queda esto:

> **Matemática, Ciencias de la Computación y Sistemas Operativos: 20 tracks, 20 vacíos.**

La portada promete «los fundamentos primero» y `/cs/` pinta *El núcleo* arriba del todo con la
frase «lo que sostiene todo lo demás». Detrás no hay nada. Es el primer problema de navegación
del sitio, por delante del scroll de la portada.

Segundo desequilibrio: **`frontend` sola es el 41 % del contenido** (2.113 lecciones). El hub
pinta las once categorías con el mismo peso visual cuando la masa real va de 0 a 2.113.

Y dos categorías tienen un solo track —`systems` (kernel) y `cloud` (cloudflare)—, así que no
están categorizando nada.

## 2. Los tracks son hondos, no cortos

Dato que condiciona cualquier diseño de barra lateral o de índice:

```
local-first 59 · kernel 58 · css 56 · three 53 · rust 52 · webgpu 47 · animacion 43
astro 42 · cloudflare 42 · solid 42 · build 41 · kotlin 40 · swift 40 · rendimiento 39
android 38 · ios 35 · canvas 32 · tca 32 · c23 31 · devtools 30 · estado 30 · lua 30
neovim 27 · maquinas 26 · flux 24 · elm 22 · mvi 22 · reactividad-fina 13
```

Media ~37 niveles por track. Nada que se diseñe para «8 niveles» sirve aquí.

Cada track escrito trae además su propia `ontologia.mdx` en el nivel 0 —un mindmap de su
territorio, 19 de ellos—. La ontología **por tema** ya existe; la que falta es la de arriba.

## 3. El diagnóstico: falta un eje

El par `nucleo | aplicaciones` responde a dos preguntas distintas a la vez, y por eso hay cosas
que no se dejan clasificar:

| | ¿es cierto sin importar la tecnología? | ¿hay que saberlo antes? |
| --- | --- | --- |
| `algoritmos` | sí | sí |
| `css`, `android` | no | no |
| `neovim`, `git`, `bash` | **no** | **sí** |

Git no es cierto «independientemente de la tecnología» — git *es* una tecnología. Pero tampoco
se puede estudiar nada sin editor, shell y control de versiones. Por el eje de arriba es
aplicación; por el de abajo es núcleo. No es una duda de clasificación: **el esquema tiene un eje
de menos**.

## 4. El núcleo y las aplicaciones están duplicados, no separados

```
programacion-reactiva   núcleo    0 lecc   ↔  reactividad (categoría)   821 lecc
teoria-lenguajes        núcleo    0 lecc   ↔  lenguajes (categoría)     905 lecc
teoria-tipos            núcleo    0 lecc   ↔  swift + kotlin + rust     648 lecc
drivers-io              núcleo    0 lecc   ↔  kernel                    247 lecc
memoria-virtual         núcleo    0 lecc   ↔  kernel, rust, c23
concurrencia            núcleo    0 lecc   ↔  «async» en 8 tracks
```

No son dos cajones de cosas distintas: son **el mismo contenido en dos niveles de abstracción**,
modelado como duplicación en vez de como enlace. La tesis del sitio —pocas reglas que generan
muchos casos— está rota estructuralmente: la regla vive en un track vacío y los casos en otra
categoría, sin una sola arista entre ambos.

## 5. Los tres estratos

Sustituyen al eje `plano`:

| estrato | qué es | quién cae aquí |
| --- | --- | --- |
| `concepto` | cierto sin importar la tecnología | matemática, ciencias de la computación, sistemas operativos, system design |
| `implementación` | el concepto con la forma de una tecnología concreta | lenguajes, frontend, reactividad, móvil, kernel, cloud |
| `herramienta` | con lo que se trabaja, no lo que se estudia | neovim, git, bash, tmux, fzf-ripgrep, dotfiles |

«Implementación» dice de qué: una implementación *del concepto*. Es la relación
interfaz→implementación, vocabulario de CS y no metáfora.

El estrato `herramienta` recoge además lo que hoy cuelga fuera de la jerarquía justo porque no
encajaba: `/config/`, `/recursos/` y las 28 cheatsheets. Es lo único del sitio que se consulta a
diario en vez de recorrerse una vez.

## 6. Las dos relaciones

**`ensena` — concepto → track:nivel.** Un concepto no necesita track propio para existir en el
mapa. `memoria-virtual` tiene 0 lecciones y 46 niveles que lo enseñan en 18 tracks. El nodo
existe y lleva ahí. Con esto el núcleo pasa de 0 nodos clicables a 30, todos aterrizando en
lecciones escritas, sin escribir una lección nueva.

**`abre` — track → track.** Las aristas del roadmap: qué habilita qué. Es lo que hace dibujable
«el núcleo abre las rutas del resto» en vez de dejarlo en una frase.

Limitación honesta de `ensena`: la página de un concepto es un índice, no una lección. Quien
llegue buscando *aprender* memoria virtual encuentra una ruta, no un texto.

## 7. Las aristas (bootstrap)

620 aristas concepto→nivel. **Ninguno de los 30 conceptos está huérfano**: todos tienen entre 1 y
69 niveles que ya los enseñan. El núcleo no está vacío, está sin indexar.

Cómo se generó: regex del nombre del concepto contra `nombre + subtítulo + tags` de cada nivel de
los 28 tracks escritos. **Es un punto de partida, no la verdad** — hay que revisar los pesos a
mano. Falsos positivos conocidos:

- `event-driven` casa con el nivel `0` de 28 tracks: es la `ontologia.mdx` de cada uno, que menciona
  eventos en su mindmap. Casi todas esas 28 aristas sobran.
- `estructuras-datos: devtools 6` pilla el árbol del DOM.
- `monolitos: build 10` pilla «monorepo» y «módulo».

| concepto | aristas | tracks | dónde |
| --- | --- | --- | --- |
| `concurrencia` | 69 | 24 | kernel:14,15,16,17,18,19,34,35,36,37,40,48 · swift:3,23,24,25,26,27,37 · rust:29,30,31,32,35,36 · solid:26,28,29,30,37 · local-first:13,16,18,22 · maquinas:2,5,6,21 · lua:14,15,16 · rendimiento:19,20,22 · cloudflare:21,24 · devtools:6,10 · estado:25,26 · flux:15,22 · ios:14,15 · mvi:4,20 · neovim:12,18 · tca:10,22 · webgpu:8,33 · animacion:3 · build:6 · c23:27 · canvas:11 · css:44 · elm:8 · kotlin:23 |
| `event-driven` | 59 | 28 | devtools:0,6,7,8,9 · cloudflare:0,9,17,24 · kernel:0,28,32,34 · three:0,10,15,21 · build:0,8,30 · estado:0,17,22 · local-first:0,14,32 · neovim:9,12,23 · webgpu:0,7,34 · android:0,3 · canvas:0,16 · css:0,47 · ios:0,20 · lua:0,11 · maquinas:0,4 · mvi:0,10 · solid:0,9 · *(+11 tracks solo en el nivel 0 — falso positivo)* |
| `programacion-reactiva` | 47 | 17 | solid:0,3,4,10,13,14,15,19,30,34 · reactividad-fina:0,2,4,9,10,11,12 · estado:3,4,5,6,23,28 · tca:2,3,6,12,13,22 · flux:4,10,11 · cloudflare:10,36 · kotlin:20,26 · mvi:5,16 · animacion:12 · elm:2 · ios:2 · kernel:56 · local-first:15 · maquinas:6 · rust:35 · swift:25 · three:46 |
| `teoria-tipos` | 46 | 21 | rust:3,6,13,14,15,16,17,18,46 · swift:1,2,6,10,11,12,17 · c23:4,12,15 · lua:2,5,17 · tca:4,8,16 · astro:24,29 · build:26,27 · elm:3,4 · kotlin:4,15 · maquinas:11,23 · android:14 · animacion:19 · cloudflare:28 · css:24 · devtools:28 · estado:21 · flux:13 · ios:19 · kernel:44 · neovim:19 · webgpu:10 |
| `memoria-virtual` | 46 | 18 | kernel:18,20,21,22,23,25,26,38,42 · c23:2,8,10,13,14,30 · rust:1,8,9,12,38,43 · local-first:35,44,45,46 · webgpu:5,10,12,32 · swift:18,20,21 · lua:11,21 · rendimiento:28,29 · android:15 · astro:10 · devtools:20 · estado:14 · flux:1 · ios:24 · kotlin:34 · reactividad-fina:7 · solid:11 · three:9 |
| `teoria-lenguajes` | 39 | 19 | astro:0,1,2,3,25,27,29,35 · kotlin:1,19,28 · neovim:0,1,16 · rust:44,45,51 · swift:4,16,33 · android:17,35 · animacion:27,41 · css:50,52 · lua:22,27 · tca:4,5 · c23:15 · canvas:1 · devtools:5 · elm:8 · ios:30 · kernel:44 · reactividad-fina:11 · solid:39 · three:43 |
| `estructuras-datos` | 38 | 19 | devtools:2,5,8,10,20,25 · cloudflare:14,31,39 · estado:9,15,19 · kernel:3,10,29 · local-first:32,36,42 · neovim:16,17,18 · css:13,21 · reactividad-fina:7,8 · rendimiento:18,29 · tca:17,19 · android:14 · build:21 · c23:13 · canvas:30 · ios:7 · lua:23 · rust:19 · solid:16 · three:9 |
| `diseno-apis` | 30 | 16 | astro:11,12,22,28,34 · android:1,5,22 · kotlin:5,19,37 · lua:23,24,25 · neovim:8,10,22 · build:15,30 · swift:12,35 · animacion:36 · canvas:6 · cloudflare:26 · css:1 · kernel:31 · local-first:10 · mvi:11 · rust:40 · webgpu:23 |
| `monolitos` | 27 | 13 | build:1,2,5,7,9,11,17,30,31,37 · kernel:1,5,7,8,43 · lua:13,25 · astro:40 · c23:16 · devtools:11 · elm:12 · ios:17 · neovim:7 · rust:47 · solid:22 · swift:28 · tca:26 |
| `syscalls` | 23 | 12 | c23:6,21,22,23,30 · kernel:2,12,13,45 · cloudflare:6,9,30 · rust:26,39 · webgpu:41,45 · devtools:29 · elm:18 · estado:7 · lua:27 · mvi:8 · neovim:19 · swift:22 |
| `sistemas-ficheros` | 22 | 13 | local-first:6,9,10,12,13 · android:16,22 · cloudflare:22,27 · ios:3,12 · kernel:37,38 · webgpu:20,23 · astro:8 · c23:7 · devtools:22 · estado:13 · flux:20 · tca:25 · three:42 |
| `dotfiles` | 20 | 12 | build:6,12,15 · neovim:2,4,21 · astro:2,29 · cloudflare:8,38 · kernel:4,30 · solid:2,32 · c23:2 · devtools:1 · maquinas:11 · rust:2 · three:23 · webgpu:4 |
| `procesos` | 17 | 9 | kernel:23,36,46,47,52,56 · c23:3,15 · neovim:13,14 · rendimiento:20,24 · android:5 · css:9 · maquinas:17 · reactividad-fina:8 · three:37 |
| `sistemas-distribuidos` | 14 | 6 | local-first:20,24,25,26,27,43 · estado:16,19 · ios:13,23 · webgpu:8,39 · maquinas:21 · swift:27 |
| `drivers-io` | 14 | 5 | kernel:15,27,28,29,31,33,34,36,42,55 · devtools:27 · lua:18 · rust:50 · webgpu:28 |
| `bash` | 14 | 8 | neovim:4,13,20 · astro:17,26 · canvas:10,21 · css:38,40 · three:27,43 · cloudflare:4 · local-first:3 · webgpu:14 |
| `teoria-numeros` | 12 | 8 | local-first:45,48,55 · build:25,36 · ios:17,26 · c23:16 · lua:6 · rust:19 · tca:26 · webgpu:36 |
| `consistencia` | 12 | 9 | local-first:7,23,41 · cloudflare:17,22 · android:22 · build:5 · canvas:3 · estado:8 · ios:26 · reactividad-fina:5 · solid:7 |
| `matematica-discreta` | 11 | 9 | build:11,17 · three:6,38 · android:16 · animacion:6 · css:7 · estado:23 · local-first:28 · reactividad-fina:2 · solid:10 |
| `algebra-lineal` | 11 | 6 | three:2,3,4,6,13 · canvas:1,6 · cloudflare:29 · css:42 · local-first:22 · webgpu:37 |
| `microservicios` | 10 | 6 | three:13,17,26,28 · cloudflare:13,30 · android:21 · local-first:19 · neovim:19 · solid:35 |
| `complejidad` | 7 | 6 | android:31,32 · estado:1 · ios:25 · kernel:49 · neovim:25 · swift:34 |
| `microkernels` | 7 | 5 | kernel:1,52,53 · cloudflare:2 · lua:26 · rendimiento:28 · swift:23 |
| `tmux` | 7 | 5 | devtools:0,3,24 · animacion:40 · astro:25 · maquinas:20 · solid:38 |
| `logica` | 5 | 4 | rust:37,40 · estado:22 · maquinas:4 · neovim:17 |
| `git` | 4 | 3 | local-first:41,47 · kernel:3 · solid:7 |
| `algoritmos` | 3 | 3 | css:16 · swift:6 · webgpu:34 |
| `probabilidad` | 3 | 3 | ios:27 · neovim:5 · three:33 |
| `computabilidad` | 2 | 2 | kotlin:6 · maquinas:9 |
| `fzf-ripgrep` | 1 | 1 | neovim:4 |

## 8. Lo que esto revela

Las cuatro últimas filas son el hallazgo incómodo:

> Con 5.078 lecciones, **`algoritmos` aparece 3 veces y `computabilidad` 2.**

El sitio no enseña algoritmos ni computabilidad. Tampoco probabilidad. Hoy eso no se ve porque
está escondido tras un «5 por escribir» en gris; con el mapa se ve al entrar. Un mapa que sabe
enseñar sus propios huecos es más útil que uno que los tapa.

Al otro extremo, `concurrencia` (69 aristas, 24 tracks) y `event-driven` son conceptos que el
sitio enseña por todas partes sin haberlos nombrado nunca en un sitio.

## 9. El modelo de datos

Las relaciones `ensena` (N:M entre concepto, track y nivel) y `abre` no se modelan en JSON por
fichero: se duplican. Van a SQLite.

```sql
CREATE TABLE estrato   (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, orden INT NOT NULL);

CREATE TABLE categoria (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT NOT NULL,
                        estrato TEXT NOT NULL REFERENCES estrato(id),
                        color TEXT NOT NULL, orden INT NOT NULL);

CREATE TABLE track     (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, subtitulo TEXT NOT NULL,
                        descripcion TEXT NOT NULL,
                        categoria TEXT NOT NULL REFERENCES categoria(id),
                        estado TEXT NOT NULL CHECK (estado IN ('escrito','concepto','planeado')),
                        icono TEXT NOT NULL, color TEXT, orden INT NOT NULL);

CREATE TABLE nivel     (track TEXT NOT NULL REFERENCES track(id), idx INT NOT NULL,
                        nombre TEXT NOT NULL, subtitulo TEXT NOT NULL, descripcion TEXT NOT NULL,
                        PRIMARY KEY (track, idx));

CREATE TABLE etiqueta  (track TEXT NOT NULL, idx INT NOT NULL, etiqueta TEXT NOT NULL,
                        PRIMARY KEY (track, idx, etiqueta),
                        FOREIGN KEY (track, idx) REFERENCES nivel(track, idx));

CREATE TABLE leccion   (id TEXT PRIMARY KEY,          -- ruta del .mdx: la prosa sigue en fichero
                        track TEXT NOT NULL, nivel INT NOT NULL, orden INT NOT NULL,
                        posicion TEXT NOT NULL, titulo TEXT NOT NULL, descripcion TEXT NOT NULL,
                        minutos INT,
                        FOREIGN KEY (track, nivel) REFERENCES nivel(track, idx));

-- Las dos que hoy no existen en ninguna parte.
CREATE TABLE ensena    (concepto TEXT NOT NULL REFERENCES track(id),
                        track TEXT NOT NULL, nivel INT NOT NULL,
                        peso INT NOT NULL DEFAULT 1,   -- central o de pasada
                        PRIMARY KEY (concepto, track, nivel),
                        FOREIGN KEY (track, nivel) REFERENCES nivel(track, idx));

CREATE TABLE abre      (origen TEXT NOT NULL REFERENCES track(id),
                        destino TEXT NOT NULL REFERENCES track(id),
                        PRIMARY KEY (origen, destino));
```

Tres decisiones que van con esto:

- **El `.sql` va en git, el `.db` se genera en el build** (y a `.gitignore`). Git no diffea un
  binario: con el `.db` como fuente de verdad se pierden el historial y la edición en el editor.
  Esquema y semillas como texto; la base es artefacto.
- **La prosa no entra.** Los 5.078 `.mdx` se quedan como ficheros — son el pipeline de MDX, los
  componentes y Shiki. SQLite se lleva la estructura, no el texto.
- **Dos runtimes.** En build basta `node:sqlite` (Astro 7 ya exige Node 22.12+, cero dependencias
  nuevas): `contenido.ts` pasa de 58 lecturas de fichero más filtros en JS a un `JOIN`. En el
  navegador, WASM + OPFS solo donde gana —mapa, búsqueda global y progreso de lectura—, cargado
  bajo demanda. El progreso lo pide el propio diseño («44 % leído · reanudar en Nivel 3») y con
  5.078 lecciones `localStorage` es el instrumento equivocado.

## 10. Estado de las decisiones

Cerrado:

- El mapa de `/cs/` es la pieza principal del sitio.
- Tres estratos en vez de dos planos.
- `ensena` y `abre` como relaciones de primera clase.
- Los 30 tracks vacíos se convierten en conceptos con página propia (`/conceptos/…`).
- La estructura va a SQLite con el `.sql` en git.

Abierto:

- Los pesos de las 620 aristas: revisión a mano, empezando por limpiar el nivel `0` de
  `event-driven`.
- El grafo `abre`: aún no existe, hay que escribirlo.
- Si `system-design` es `concepto` o se parte (`monolitos`/`microservicios` son patrones;
  `local-first`, con 291 lecciones, se comporta como implementación).
- Fusionar `systems` y `cloud`, que tienen un track cada una.
