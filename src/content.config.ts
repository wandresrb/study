import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const categorias = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/categorias' }),
  schema: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().min(1),
    colorHex: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradFrom: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradTo: z.string().regex(/^#[0-9a-f]{6}$/i),
    plano: z.enum(['nucleo', 'aplicaciones']),
    orden: z.number().int().nonnegative(),
  }),
});

const tracks = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/tracks' }),
  schema: z.object({
    nombre: z.string().min(1),
    subtitulo: z.string().min(1),
    descripcion: z.string().min(1),
    colorHex: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradFrom: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradTo: z.string().regex(/^#[0-9a-f]{6}$/i),
    estado: z.enum(['disponible', 'proximamente']),
    orden: z.number().int().nonnegative(),
    categoria: reference('categorias').optional(),
    ref: z.object({ config: z.string().optional(), recursos: z.string().optional() }).optional(),
    extras: z.object({
      features: z.array(z.object({ i: z.string(), t: z.string(), d: z.string() })),
      chips: z.array(z.object({ n: z.string(), c: z.string() })),
    }).optional(),
  }),
});

const guia = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guia', retainBody: false }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    subject: reference('tracks'),
    level: z.number().int().nonnegative(),
    order: z.number().int().positive(),
    posicion: z
      .string()
      .regex(/^\d+(?:\.\d+)?$/, 'Es la posición de la lección: «17» o «17.5»'),
    duracion: z.string().optional(),
  }),
});

const niveles = defineCollection({
  loader: glob({
    pattern: '**/_niveles.json',
    base: './src/content/guia',
    generateId: ({ entry }) => entry.split('/').slice(0, -1).join('/'),
  }),
  schema: z.object({
    niveles: z.array(
      z.object({
        nombre: z.string().min(1),
        subtitulo: z.string().min(1),
        descripcion: z.string().min(1),
        tags: z.array(z.string()).min(1),
        color: z.string().optional(),
        colorHex: z.string().optional(),
        icono: z.string().regex(/^\d+$/).optional(),
      }),
    ).min(1),
  }),
});

const cheatsheets = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/cheatsheets' }),
  schema: z.object({
    meta: z.string().min(1),
    desc: z.string().min(1),
    placeholder: z.string().min(1),
    cats: z.array(
      z.object({
        cat: z.string().min(1),
        icon: z.string().min(1),
        items: z.array(z.object({ k: z.string().min(1), d: z.string().min(1) })).min(1),
      }),
    ).min(1),
  }),
});

export const collections = { categorias, tracks, guia, niveles, cheatsheets };
