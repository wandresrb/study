import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The only collection left: the lesson MDX. The structure (tracks, categories,
// levels, cheatsheets) lives in db/schema.sql + db/seeds and build-db validates
// it — including that subject/level point at a real track and level.
const guide = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guide', retainBody: false }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    subject: z.string().min(1),
    level: z.number().int().nonnegative(),
    order: z.number().int().positive(),
    position: z
      .string()
      .regex(/^\d+(?:\.\d+)?$/, 'Es la posición de la lección: «17» o «17.5»'),
    duration: z.string().optional(),
  }),
});

export const collections = { guide };
