// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Transformer de Shiki (nativo) para exponer el `title="archivo"` de los
// bloques de código como atributo data-title, que la CSS pinta como "chip".
// Es best-effort: si el meta no está disponible, simplemente no se muestra.
const fileTitleTransformer = {
  name: 'file-title',
  pre(node) {
    try {
      // @ts-ignore - contexto del transformer de Shiki
      const raw = this?.options?.meta?.__raw ?? '';
      const m = /title="([^"]+)"/.exec(raw);
      if (m) {
        node.properties = node.properties || {};
        node.properties['data-title'] = m[1];
      }
    } catch {
      /* noop */
    }
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://wandres.dev',
  // `cacheDir` se deja en su valor por defecto (node_modules/.astro) a propósito:
  // es la ruta exacta que Cloudflare Workers Builds cachea para Astro, y esas
  // rutas no son configurables. Cambiarlo rompería el caché en CI.
  experimental: {
    // Reusa el HTML de páginas cuyo `cacheKey` y grafo de módulos no cambiaron.
    // Requiere devolver `cacheKey` desde getStaticPaths (ver guia/[...slug].astro).
    incrementalBuild: true,
  },
  markdown: {
    // Resaltado con Shiki NATIVO (first-party, compatible con Astro 7 / Vite 8)
    shikiConfig: {
      theme: 'catppuccin-mocha',
      wrap: false,
      transformers: [fileTitleTransformer],
    },
  },
  integrations: [mdx()],
});
