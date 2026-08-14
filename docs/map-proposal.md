# El mapa de `/cs/`: análisis y propuesta

La tarea principal de la revisión de la ontología (docs/ontology.md la define como referencia de
dos trabajos: este y SQLite). Medido sobre el catálogo real el 2026-08-14. **Nada de esto toca el
mapa hasta que se apruebe**: el mapa es la pieza principal y se queda.

## 1. La masa real, caja por caja

| estrato | caja | tracks escritos | lecciones | horas |
| --- | --- | --- | --- | --- |
| núcleo | System Design | 1/6 | **291** | 93 |
| núcleo | Ciencias de la Computación | 0/9 | 0 | 0 |
| núcleo | Matemática | 0/5 | 0 | 0 |
| núcleo | Sistemas Operativos | 0/6 | 0 | 0 |
| implementaciones | Frontend | 10/10 | **2.113** | 608 |
| implementaciones | Lenguajes | 5/5 | 905 | 275 |
| implementaciones | Programación Reactiva | 7/7 | 821 | 247 |
| implementaciones | Móvil | 2/2 | 357 | 114 |
| implementaciones | Programación de Sistemas | **1/1** | 247 | 64 |
| implementaciones | Cloud y Edge | **1/1** | 206 | 57 |
| herramientas | Entorno de Desarrollo | 1/6 | 138 | 46 |

Cuatro hechos que el mapa de hoy esconde:

1. **El núcleo, que abre el mapa prometiendo «lo que sostiene todo lo demás», tiene 0 lecciones**
   en tres de sus cuatro cajas. La única con contenido es System Design, y su contenido es…
2. **…local-first, el track más grande de todo el sitio** (291 lecciones — más que css, three o
   rust), archivado entre conceptos vacíos como si fuera uno de ellos. El #1 del sitio está
   escondido en la sección «vacía».
3. **Frontend es el 42 % del sitio** (2.113 de 5.078) y su caja pesa visualmente lo mismo que
   Cloud y Edge, que tiene una décima parte.
4. **Dos cajas agrupan una sola cosa**: Programación de Sistemas = kernel; Cloud y Edge =
   cloudflare. Una caja con un elemento no clasifica, estorba.

## 2. La propuesta, en cuatro movimientos

### M1 — El núcleo deja de mentir

Las tres cajas conceptuales vacías (Matemática, CS, SO) y la parte conceptual de System Design no
son «tracks por escribir»: son **conceptos ya indexados** con 593 aristas hacia las lecciones
reales, y ya tienen su pantalla (`/concepts`, el espectro). Propuesta: en el mapa, la sección del
núcleo se compacta — cada categoría conceptual pasa a ser una **banda de una línea**: nombre, sus
conceptos como texto **enlazado** a `/concepts/{id}` y el dato honesto («concurrencia · ya en 24
tracks»). Sin fichas, sin rejillas nuevas: el mismo lenguaje de texto discreto de hoy, pero
diciendo la verdad y con puerta al espectro. El núcleo pasa de prometer en falso a indexar de
verdad.

### M2 — Local-first baja a donde le corresponde

Es una implementación con todas las letras (291 lecciones escritas). Baja al estrato de
implementaciones, a una caja nueva junto con los otros dos huérfanos:

> **«Sistemas»** (nombre a gusto del autor): kernel (247) + cloudflare (206) + local-first (291)
> = 744 lecciones, 3 tracks — tercera caja del sitio por masa, temáticamente coherente (el SO, el
> edge, los datos locales).

Con esto **desaparecen las dos cajas de un solo track** y **System Design queda 100 % conceptual**
(monolitos, microservicios, event-driven, consistencia, distribuidos) — resuelve las dos
cuestiones abiertas de ontology.md §10 de un movimiento.

### M3 — El peso visual dice la verdad

Dentro de cada estrato, las cajas se ordenan **por masa** (lecciones, descendente), y la cabecera
de cada caja gana una **barra fina de masa** proporcional al total del sitio — el mismo lenguaje
visual del espectro de `/concepts`, así las dos pantallas riman. Frontend se ve como el 42 % que
es; nada cambia de tamaño ni de estructura, solo se añade una línea de verdad por caja.

### M4 — Los huecos, visibles y útiles

Las líneas «N por escribir» se conservan tal cual (texto discreto), con un único cambio: los
nombres que son conceptos indexados **enlazan** a su página del espectro. El texto no cambia de
aspecto; deja de ser un callejón sin salida.

## 3. Estado del grafo (insumo de esta revisión, no tarea de nadie)

- `ensena`: 620 → **593 aristas** con la poda de los falsos positivos documentados y 15 subidas a
  peso 2. Aplicada en `db/seeds/06-teaches.sql` (en el árbol, sin commitear; la chuleta está en
  `docs/teaches-review.md`).
- `abre`: de vacío a **68 aristas** base por regla mecánica (commiteado). Falta la capa que solo
  el autor puede escribir: qué abre qué entre conceptos y las herramientas como llaves
  transversales.

## 4. Lo que esta propuesta NO hace

No sustituye el mapa, no mete fichas nuevas, no toca TrackCard, no parte Frontend (el 42 % es un
problema real pero es cirugía de contenido — se decide aparte), no toca las herramientas.

## 5. Coste de ejecutar

- M2 es **solo datos**: editar `db/seeds/02-categories.sql` y `03-tracks.sql` (caja nueva, 3
  reasignaciones, borrar 2 cajas). El mapa, la paleta y los índices se regeneran solos.
- M1, M3 y M4 son **una pasada sobre `cs.astro`**, sección por sección, cada una aprobable por
  separado.
