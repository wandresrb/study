// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import solidJs from '@astrojs/solid-js';

import tailwindcss from '@tailwindcss/vite';

import pagefind from 'astro-pagefind';

import { SHIKI_THEMES } from './src/lib/themes.ts';

import { fileTitleTransformer } from './src/lib/shiki-file-title.ts';
import catalog from './src/integrations/catalog.ts';
import forceExit from './src/integrations/force-exit.ts';

export default defineConfig({
  site: 'https://wandres.dev',

  experimental: {
    // Las lecciones ya devuelven cacheKey en getStaticPaths: con el manifest de
    // node_modules/.astro persistido entre builds (actions/cache en CI), solo se
    // regeneran las páginas cuyo contenido o dependencias cambiaron.
    incrementalBuild: true,
    collectionStorage: 'chunked',
  },

  redirects: {
    '/cheatsheet': '/neovim/cheatsheet/',
  },

  trailingSlash: 'always',

  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600, 700, 800, 900],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: [400, 500, 600, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
  ],

  markdown: {
    // La notación se resuelve en el build: sale HTML con clases de KaTeX y el
    // navegador no descarga ni ejecuta nada. `throwOnError` para que una fórmula
    // rota falle el build en vez de publicarse en rojo.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { throwOnError: true, strict: 'error' }]],
    }),
    shikiConfig: {
      themes: SHIKI_THEMES,
      defaultColor: false,
      wrap: false,
      transformers: [fileTitleTransformer],
    },
  },

  // forceExit debe ir de último: su build:done corre tras sitemap y pagefind.
  integrations: [catalog(), mdx(), sitemap(), solidJs(), pagefind(), forceExit()],

  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.DB_PATH': JSON.stringify(fileURLToPath(new URL('./db/catalog.db', import.meta.url))),
    },
  },
});
