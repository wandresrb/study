import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The only collection left: the lesson MDX. The structure (tracks, categories,
// levels, cheatsheets) lives in db/schema.sql + db/seeds and build-db validates
// it — including that subject/level point at a real track and level.
const guia = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guia', retainBody: false }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    subject: z.string().min(1),
    level: z.number().int().nonnegative(),
    order: z.number().int().positive(),
    posicion: z
      .string()
      .regex(/^\d+(?:\.\d+)?$/, 'Es la posición de la lección: «17» o «17.5»'),
    duracion: z.string().optional(),
  }),
});

export const collections = { guia };
