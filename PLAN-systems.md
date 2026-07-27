# Plan — 3 temas de systems programming (nivel PhD)

Tres tracks nuevos, separados pero hermanos (el mundo de los sistemas):
**C23 moderno**, **Kernel de Linux** y **Rust**. De lo básico a nivel **Dios de verdad**.

Verificado a 2026: C23 (constexpr, typeof, _BitInt, nullptr, #embed), Rust edición 2024
(async closures, resolver v3), y el kernel con **Rust ya como lenguaje central** (jul 2026).

> Estos tres se suman al hub junto a Neovim y Swift. El diseño y formato son los mismos.

---

## TRACK 1 · C23 moderno y sistemas  (13 niveles)

De `hello world` a escribir tu propia libc mínima y entender el UB al dedillo.

- **0 · Novato** — Setup (gcc/clang, C23 con `-std=c23`), compilar, mentalidad de C moderno
- **1 · Aprendiz** — Tipos, `auto`, `constexpr`, `nullptr`, `typeof`, `_BitInt`, enums con tipo fijo
- **2 · Punteros** — Punteros, arrays, aritmética, strings, stack vs heap
- **3 · Datos** — structs, unions, `enum`, `typedef`, alineación y padding
- **4 · Memoria** — malloc/free, patrones de ownership, arenas, fugas, `#embed`
- **5 · Build moderno** — Meson a fondo, el preprocesador, unidades de traducción
- **6 · Linking y ABI** — estático vs dinámico, visibilidad de símbolos, ABI estable, versioning
- **7 · libc y freestanding** — hosted vs freestanding, glibc vs **musl**, `-nostdlib`, no-libc
- **8 · Seguridad** — ASan/UBSan/TSan/MSan, hardening, fuzzing, análisis estático
- **9 · Concurrencia** — hilos C11/C23, atomics, el modelo de memoria, mutex/condvar
- **10 · Bajo nivel** — convenciones de llamada, inline asm, SIMD, caché, optimización
- **11 · Metaprogramación** — `_Generic`, macros avanzadas, X-macros, genéricos en C
- **12 · Dios/PhD** — Undefined Behavior a fondo, el estándar como fuente, tu propia libc mínima

## TRACK 2 · Kernel de Linux  (11 niveles)

C del kernel (GNU C, freestanding, sin libc) con el tooling que iguala a C23 — y el nuevo Rust.

- **0 · Novato** — Qué es el kernel, el C del kernel, entorno y árbol de fuentes
- **1 · Build** — Kbuild y Kconfig: compilar y configurar el kernel
- **2 · Tu primer módulo** — LKM, `module_init`/`exit`, `printk`, cargar/descargar
- **3 · Estilo y APIs** — coding style, estructuras del kernel (listas, hashes), sin libc
- **4 · Drivers de carácter** — el device model, `file_operations`, `/dev`
- **5 · Concurrencia** — spinlocks, mutexes, **RCU**, atomics, barreras de memoria
- **6 · Memoria del kernel** — `kmalloc`, slab, páginas, DMA, per-CPU
- **7 · Interrupciones** — IRQ, top/bottom halves, workqueues, tasklets, timers
- **8 · Depuración** — ftrace, kgdb, dynamic debug, KASAN, lockdep
- **9 · Rust for Linux** — el nuevo lenguaje central: abstracciones seguras, un driver en Rust
- **10 · Dios/PhD** — subsistemas, el proceso de parches, contribuir upstream

## TRACK 3 · Rust  (13 niveles)

De ownership a `no_std`, kernel y programación a nivel de tipos.

- **0 · Novato** — rustup, cargo, primer programa, la mentalidad Rust
- **1 · Aprendiz** — tipos, funciones, control de flujo, edición 2024
- **2 · Ownership** — el corazón: moves, borrowing, referencias
- **3 · Datos** — structs, enums, pattern matching, `Option`/`Result`
- **4 · Traits y genéricos** — traits, genéricos, trait objects, bounds
- **5 · Errores** — `Result`, `?`, panic, errores propios, `thiserror`/`anyhow`
- **6 · Colecciones e iteradores** — `Vec`, `HashMap`, iteradores, closures
- **7 · Lifetimes** — lifetimes a fondo, dominar el borrow checker
- **8 · Concurrencia** — hilos, `Send`/`Sync`, `Arc`/`Mutex`, canales
- **9 · Async** — async/await, futures, tokio, async closures (2024)
- **10 · Unsafe y FFI** — `unsafe`, punteros crudos, interop con C, ABI
- **11 · Sistemas y no_std** — `no_std`, embebido, allocators, Rust en el kernel
- **12 · Dios/PhD** — macros, programación a nivel de tipos, internals del compilador

---

## Resumen y realidad

- **Total: ~37 niveles** en 3 tracks. A ~4–5 lecciones por nivel → **~150 lecciones**.
- Es un cuerpo de trabajo enorme (el mayor con diferencia). Para entregarlo **completo y correcto**,
  la forma sensata es construir la estructura de los 3 tracks ahora, y **escribir las lecciones
  track por track** — así tendrás un track de C23 entero y sólido antes de pasar al siguiente,
  en vez de un tercio de cada uno.

## Lo que necesito de ti

1. **Profundidad**: ¿te encajan ~12-13 niveles por track (nivel PhD), o los quieres más cortos/largos?
2. **Orden de escritura**: propongo **C23 → Kernel → Rust** (C23 es la base de los otros dos). ¿OK?
3. **En el hub**: ¿los tres como **tracks separados** (recomendado), o agrupados bajo un área "Sistemas"?

> Responde algo como **"1 ok, 2 ok, 3 separados"** y arranco con la estructura + el track de C23 completo.
