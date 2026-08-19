import type { AstroIntegration } from 'astro';

// Algo mantiene vivo el event loop cuando el build ya terminó: en Cloudflare
// el proceso quedó 13 minutos colgado tras indexar Pagefind hasta que el
// timeout lo mató con SIGKILL. Hasta diagnosticar el handle culpable, salir
// explícitamente cuando el último hook de build:done (este, por ir al final
// de `integrations`) ya corrió. setImmediate deja vaciar stdout antes de salir.
export default function forceExit(): AstroIntegration {
  return {
    name: 'force-exit',
    hooks: {
      'astro:build:done': () => {
        setImmediate(() => process.exit(0));
      },
    },
  };
}
