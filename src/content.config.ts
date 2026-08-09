import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FORMATO, existe as existeIcono } from './data/iconos';

// Un icono se declara como `set:nombre`. El regex por sí solo no basta: rechaza
// el emoji viejo, pero deja pasar `lucide:cpuu`, que reventaría mucho más
// tarde, al renderizar una de 5074 páginas y sin decir qué entrada lo
// declaraba. El `.refine` comprueba la EXISTENCIA contra el JSON del set, así
// que el fallo sale al cargar la colección, con el id de la entrada delante.
const nombreDeIcono = z
  .string()
  .regex(FORMATO, 'El icono se declara como "lucide:nombre" o "simple-icons:nombre"; ya no se aceptan emoji')
  .refine(existeIcono, 'Ese icono no existe en su set (busca el nombre exacto en icones.js.org)');

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

// Cinco entidades, cinco colecciones, y las relaciones declaradas con
// `reference()` en vez de con cadenas sueltas: da tipos, autocompletado y
// valida la FORMA de la referencia.
//
// Ojo con lo que `reference()` NO hace: la doc dice que "validation of
// referenced entries happens at runtime when using getEntry() or getEntries()".
// La EXISTENCIA del destino se comprueba al resolverla con `getEntry()`.
//
//   categorias  <—— tracks  <—— guia        (una lección pertenece a un track)
//                       ^—— niveles         (el temario de un track)
//                       ^—— cheatsheets     (la referencia rápida de un track)

const categorias = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/categorias' }),
  schema: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().min(1),
    icono: nombreDeIcono,
    colorHex: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradFrom: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradTo: z.string().regex(/^#[0-9a-f]{6}$/i),
    // Los tres planos del mapa, que son las tres pestañas de /hub:
    // `entorno` son las herramientas del día a día; `nucleo`, los conceptos
    // —matemática, CS, sistemas operativos, system design—; y `aplicaciones`,
    // los dominios donde se implementan. Un mismo tema aparece en dos planos:
    // sistemas distribuidos es concepto y Cloud su despliegue; programación
    // reactiva es paradigma y Redux o TCA sus implementaciones.
    plano: z.enum(['entorno', 'nucleo', 'aplicaciones']),
    // getCollection() no garantiza orden: hay que llevarlo en los datos.
    // El orden es dentro del plano, no global.
    orden: z.number().int().nonnegative(),
  }),
});

const tracks = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/tracks' }),
  schema: z.object({
    nombre: z.string().min(1),
    subtitulo: z.string().min(1),
    descripcion: z.string().min(1),
    logo: nombreDeIcono,
    // El hex de marca NO sale de @iconify-json/simple-icons: ese paquete declara
    // "palette": false y no trae ninguno. Se declara a mano, como gradFrom/gradTo.
    logoHex: hex.optional(),
    // Solo cuando el hex oficial no llega a 4,5:1 sobre la placa oscura (Lua y
    // CSS son azul marino y morado oscuro). La guarda de getTracks() rompe el
    // build si falta donde hace falta, así que esto no se puede olvidar.
    logoHexDark: hex.optional(),
    colorHex: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradFrom: z.string().regex(/^#[0-9a-f]{6}$/i),
    gradTo: z.string().regex(/^#[0-9a-f]{6}$/i),
    estado: z.enum(['disponible', 'proximamente']),
    orden: z.number().int().nonnegative(),
    categoria: reference('categorias').optional(),
    // Solo páginas sueltas que no son colecciones. El enlace a la cheatsheet
    // ya no se declara: existe si existe la entrada en `cheatsheets`.
    ref: z.object({ config: z.string().optional(), recursos: z.string().optional() }).optional(),
    // Bloques promocionales de la página del track. Vivían dentro del .astro.
    extras: z.object({
      features: z.array(z.object({ i: z.string(), t: z.string(), d: z.string() })),
      chips: z.array(z.object({ n: z.string(), c: z.string() })),
    }).optional(),
  }),
});

const guia = defineCollection({
  // `retainBody: false` quita 55,8 MB de los 60,6 del data store: el cuerpo
  // MDX no se lee nunca (se renderiza por import de módulo) y el sitio
  // despliega en Cloudflare, donde el tamaño del artefacto importa.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guia', retainBody: false }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    // Sin `.default()`: en Zod 4 el default toma el valor de SALIDA, y como
    // `reference()` produce `{ collection, id }`, un `.default('neovim')`
    // colaba la cadena cruda y reventaba el render. Las 5074 lecciones lo
    // declaran explícitamente.
    subject: reference('tracks'),
    level: z.number().int().nonnegative(),
    order: z.number().int().positive(),
    icon: z.string().default('•'),
    duracion: z.string().optional(),
  }),
});

// El temario de cada track, en su carpeta de contenido. El id de la entrada es
// el id del track, así que la relación es la propia clave.
const niveles = defineCollection({
  loader: glob({
    pattern: '**/_niveles.json',
    base: './src/content/guia',
    generateId: ({ entry }) => {
      const dir = entry.split('/').slice(0, -1).join('/');
      return dir === '' ? 'neovim' : dir;
    },
  }),
  schema: z.object({
    niveles: z.array(
      z.object({
        nombre: z.string().min(1),
        subtitulo: z.string().min(1),
        descripcion: z.string().min(1),
        tags: z.array(z.string()).min(1),
        // Se calculan desde la paleta; solo se declaran si el track se sale
        // del patrón (hoy, únicamente neovim).
        color: z.string().optional(),
        colorHex: z.string().optional(),
        // Los enteros son tipografía legítima —el temario numera los niveles
        // intermedios— y se quedan. Todo lo demás tiene que ser un icono de
        // verdad, para que un emoji rezagado no sobreviva a la migración.
        icono: z.union([z.string().regex(/^\d+$/), nombreDeIcono]).optional(),
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
