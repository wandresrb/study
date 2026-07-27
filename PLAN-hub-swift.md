# Plan — Hub de estudio multi-tema + Track de Swift/iOS

Objetivo: convertir el sitio (hoy solo Neovim) en **tu hub de estudio**, donde
Neovim es un tema más, y añadir el siguiente: **Swift 6.3 · SwiftUI · SwiftData · iOS**.
Mismo diseño y formato que ya te gustan.

---

## PARTE 1 — De guía única a hub multi-tema

### Cómo se verá
- **Portada nueva (`/`)**: "Elige tu tema" con tarjetas grandes → **Neovim** (listo),
  **Swift & iOS** (nuevo), y huecos "próximamente" para futuros temas.
- Cada tema es un **track** con su propia portada, sus niveles y sus lecciones,
  reutilizando exactamente el diseño actual.
- **Neovim no se rompe**: sus 34 lecciones y sus URLs siguen igual; solo gana una
  portada propia en `/neovim` y el sidebar pasa a ser "de Neovim".

### Bajo el capó (cambios técnicos)
1. **`src/data/tracks.ts`** (nuevo): define los temas y, dentro de cada uno, sus niveles.
   Los 7 niveles actuales de Neovim se mueven aquí sin cambios.
2. **Campo `subject`** en el frontmatter de cada lección (`neovim` / `swift`).
   Un script añade `subject: neovim` a las 34 lecciones existentes automáticamente.
3. **Portada hub** (`index.astro`) + **portada por track** (`/[track]`, p. ej. `/neovim`, `/swift`).
4. **Sidebar** y **breadcrumb** filtran por el tema de la lección.
5. Cheatsheet / Config / Recursos quedan como **referencia del track Neovim**
   (Swift tendrá su propia referencia si la quieres).

---

## PARTE 2 — Track "Swift & iOS" (Swift 6.3 / SwiftUI / SwiftData / iOS 26)

Verificado a julio 2026: **Swift 6.3** (Xcode 26.4), **iOS 26 SDK**, framework
**Observation** (`@Observable`), `@State` como macro, **SwiftData** con herencia de
modelos, **Swift Testing** (`@Test`/`#expect`) y **concurrencia estricta** de Swift 6.

### Temario propuesto (7 niveles, mismo esquema 0→dios)

**Nivel 0 · Novato — Fundamentos de Swift 6.3**
- 0.1 Setup: Xcode 26, Playgrounds y tu primer código
- 0.2 Variables, tipos y `let`/`var`
- 0.3 Opcionales (el corazón de Swift): `?`, `if let`, `guard`, `??`
- 0.4 Colecciones: Array, Dictionary, Set y bucles
- 0.5 Funciones y closures

**Nivel 1 · Aprendiz — Swift a fondo**
- 1.1 Structs vs clases (valor vs referencia)
- 1.2 Enums con valores asociados y pattern matching
- 1.3 Protocolos y extensiones (programación orientada a protocolos)
- 1.4 Genéricos
- 1.5 Manejo de errores con typed throws (Swift 6.3)

**Nivel 2 · Ninja — SwiftUI esencial**
- 2.1 Tu primera vista y el paradigma declarativo
- 2.2 Layout: VStack/HStack/ZStack, Grid, spacing y alignment
- 2.3 Modificadores y composición de vistas
- 2.4 Estado: `@State` (macro), `@Binding`, flujo de datos
- 2.5 Listas, navegación (NavigationStack) y formularios

**Nivel 3 · Experto — SwiftUI avanzado**
- 3.1 `@Observable` y el framework Observation
- 3.2 Environment y comunicación entre vistas
- 3.3 Animaciones y transiciones
- 3.4 Gestos y dibujo (Canvas, Shapes)
- 3.5 APIs nuevas de iOS 26: toolbar, contenedores reordenables, Document

**Nivel 4 · Arquitecto de datos — SwiftData**
- 4.1 `@Model` y tu primer almacén persistente
- 4.2 `@Query`, filtros y ordenación
- 4.3 Relaciones y herencia de modelos (novedad 2026)
- 4.4 Migraciones y sincronización con CloudKit
- 4.5 Cuándo seguir con Core Data

**Nivel 5 · Concurrencia y mundo real**
- 5.1 async/await y Tasks
- 5.2 Actores, `@MainActor` y `Sendable`
- 5.3 Concurrencia estricta de Swift 6 sin dolor
- 5.4 Redes: URLSession, Codable y async
- 5.5 Async streams y AsyncImage

**Nivel 6 · Dios — De la idea a la App Store**
- 6.1 Arquitectura: MV, MVVM y modularización
- 6.2 Inyección de dependencias
- 6.3 Testing con Swift Testing (`@Test`, `#expect`)
- 6.4 Accesibilidad y localización
- 6.5 Publicar: firmas, TestFlight y App Store + CI

**Total: ~32 lecciones.** Cada una con el mismo formato (objetivos, código real, callouts, retos).

---

## Decisiones que necesito de ti

1. **Nombres de nivel para Swift**: ¿los mismos gamificados (Novato → Dios) para que
   el hub sea coherente, o nombres temáticos de iOS?
2. **Referencia de Swift**: ¿le hago también su propio "cheatsheet" (sintaxis, modificadores
   SwiftUI, atajos de Xcode), o de momento solo el temario?
3. ¿Ajustamos el temario (quitar/añadir algún nivel o lección) o le doy tal cual?

> Alcance: entiendo que quieres **todo el track completo** (los 7 niveles), como con Neovim.
> Y el Nivel 6 sí incluye construir una app real de principio a fin, porque en iOS
> "aprender" y "hacer una app" van juntos — a diferencia de Neovim, aquí el código **es** el tema.
