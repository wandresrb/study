// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

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
    // El data store pasa de un único fichero de 60 MB a varios trozos. La doc
    // lo recomienda "when deploying to platforms that have a size limit for
    // individual assets", que es el caso de Cloudflare.
    collectionStorage: 'chunked',
  },

  // /cheatsheet se movió a /neovim/cheatsheet al unificar las 25 hojas en una
  // ruta dinámica. Sin esto la URL antigua queda muerta.
  redirects: { '/cheatsheet': '/neovim/cheatsheet/' },

  // El formato de build es `directory`, y la doc pide fijar trailingSlash a
  // 'always' con ese formato para que dev y producción no discrepen.
  trailingSlash: 'always',

  // Prefetch al pasar el ratón. Es un sitio de lectura secuencial: se va de una
  // lección a la siguiente, y el enlace se subraya antes de pulsarlo.
  // `viewport` sería contraproducente aquí: la barra lateral llega a tener
  // doscientos enlaces visibles y los descargaría todos.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // Fuentes autohospedadas. Antes venían de fonts.googleapis.com, lo que
  // costaba dos preconnect a un tercero y una hoja de estilos bloqueante en
  // cada una de las 5074 páginas. Astro las descarga en build, genera el
  // @font-face y calcula métricas de reserva para que el intercambio no
  // desplace el texto.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600, 700, 800, 900],
      // Por defecto son ['normal', 'italic']: sin esto se generan también las
      // cursivas de los seis pesos, que no se usan.
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: [400, 500, 600, 700],
      // La cursiva monoespaciada solo la usan los comentarios del tema de
      // código; el peso 800 no lo usa nadie.
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
  ],
  markdown: {
    // Resaltado con Shiki NATIVO (first-party, compatible con Astro 7 / Vite 8)
    shikiConfig: {
      theme: 'catppuccin-mocha',
      wrap: false,
      transformers: [fileTitleTransformer],
    },
  },
  integrations: [mdx(), sitemap()],
});
