import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Colección "guia": todas las lecciones en MDX.
const guia = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guia' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    subject: z.string().default('neovim'), // 'neovim' | 'swift' | ...
    level: z.number(),      // 0..6
    order: z.number(),      // orden dentro del nivel
    icon: z.string().default('•'),
    duracion: z.string().optional(),
  }),
});

export const collections = { guia };
