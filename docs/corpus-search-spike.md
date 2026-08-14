# Spike: búsqueda del corpus (tarea #10) — medidas del 2026-08-14

Pagefind 1.x ejecutado tal cual (`bunx pagefind --site dist`) sobre el build real de 5.172
páginas, sin integración ni configuración. La decisión Pagefind vs FTS5+HTTP-Range se toma con
estos números.

## Medidas

| qué | valor |
| --- | --- |
| indexado | 5.172 páginas · 160.499 palabras · **10,3 s** de build |
| idioma | detectado por `lang` del `<html>`: **stemmer de español** (`wasm.es.pagefind`, 71 KB) |
| índice | 583 chunks · 25,7 MB total · **45 KB de media** (el mayor, 472 KB) |
| fragmentos | 5.172 (uno por página, ~5,6 KB) — solo se piden los de los resultados pintados |
| runtime | `pagefind.js` 44 KB + wasm 71 KB |
| coste por consulta | entry + wasm + runtime + 1-3 chunks + ~5 fragmentos ≈ **150-350 KB**, cacheable |
| peso en `dist/` | **68 MB · ~10.600 ficheros** (nunca se descargan enteros) |

## Lo que implica

- El coste percibido por el usuario es una fracción de lo que costaría cualquier variante de
  base de datos embarcada: no hay motor SQL, no hay workers propios, y desde 1.5 la búsqueda ya
  corre en un Web Worker de serie.
- La factura real es del **despliegue**: +68 MB y ~10.600 ficheros en `dist/`. Cloudflare
  (Workers static assets) admite hasta 20.000 ficheros por despliegue; hoy `dist/` está en ~7.000,
  con Pagefind quedaría en ~17.600 — **cabe, pero cerca del techo**. Si el sitio dobla de tamaño,
  habrá que excluir fragmentos o revisar el hosting de la búsqueda.
- Pendiente de probar en navegador (con el sitio servido): calidad del stemming español
  (plurales/conjugaciones) y latencia de la primera consulta contra Cloudflare.

## Veredicto provisional

Pagefind gana: mismo caso de uso, sin WASM de motor, sin COOP/COEP, integración de un paso
(`astro-pagefind` como post-build). FTS5+Range solo se reconsidera si el techo de ficheros de
Cloudflare se convierte en problema real. La integración es una tarea propia, fuera de este arco.
