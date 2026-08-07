import { getEntry, getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

// Helpers sobre las colecciones. No guardan datos: solo consultan y calculan
// lo que es derivable (color e icono de nivel, orden, agrupaciones).

export interface Nivel {
  id: number;
  nombre: string;
  subtitulo: string;
  descripcion: string;
  tags: string[];
  color: string;
  colorHex: string;
  icono: string;
}

// Paleta cíclica. Es cálculo, no contenido, así que no vive en los datos.
const PAL = ['var(--green)', 'var(--blue)', 'var(--mauve)', 'var(--sky)', 'var(--peach)', 'var(--teal)', 'var(--yellow)', 'var(--pink)', 'var(--lavender)', 'var(--sapphire)', 'var(--maroon)'];
const PALHEX = ['#a6e3a1', '#89b4fa', '#cba6f7', '#89dceb', '#fab387', '#94e2d5', '#f9e2af', '#f5c2e7', '#b4befe', '#74c7ec', '#eba0ac'];

/** El temario de un track, con lo visual ya resuelto. */
export async function getNiveles(trackId: string): Promise<Nivel[]> {
  const entry = await getEntry('niveles', trackId);
  // Devolver [] escondía el fallo y reaparecía como `nivel.color` de undefined
  // dentro de GuideLayout. Que reviente donde está la causa.
  if (!entry) throw new Error(`El track "${trackId}" no tiene temario (_niveles.json)`);
  const total = entry.data.niveles.length;
  return entry.data.niveles.map((n, i) => ({
    id: i,
    nombre: n.nombre,
    subtitulo: n.subtitulo,
    descripcion: n.descripcion,
    tags: n.tags,
    color: n.color ?? PAL[i % PAL.length],
    colorHex: n.colorHex ?? PALHEX[i % PALHEX.length],
    icono: n.icono ?? (i === 0 ? '🗺️' : i === total - 1 ? '🔱' : String(i)),
  }));
}

/** Un nivel suelto. Devuelve el 0 como reserva para no romper el render. */
export async function nivelDe(trackId: string, levelId: number): Promise<Nivel> {
  const ns = await getNiveles(trackId);
  return ns.find((n) => n.id === levelId) ?? ns[0];
}

export type Track = CollectionEntry<'tracks'>;
export type Categoria = CollectionEntry<'categorias'>;

/** Todos los tracks en el orden declarado. */
export async function getTracks(): Promise<Track[]> {
  return (await getCollection('tracks')).sort((a, b) => a.data.orden - b.data.orden);
}

/** Un track por su id. Lanza si no existe: es un fallo de datos, no un 404. */
export async function getTrack(id: string): Promise<Track> {
  const t = await getEntry('tracks', id);
  if (!t) throw new Error(`No existe el track "${id}" en la colección tracks`);
  return t;
}

/** Las categorías en orden, cada una con sus tracks en orden. */
export async function getCategoriasConTracks(): Promise<Array<{ cat: Categoria; tracks: Track[] }>> {
  const [cats, ts] = await Promise.all([getCollection('categorias'), getTracks()]);
  // `reference()` valida la forma, no la existencia: si un track apunta a una
  // categoría que no existe se caería de la portada sin decir nada.
  for (const t of ts) {
    if (t.data.categoria && !(await getEntry(t.data.categoria))) {
      throw new Error(`El track "${t.id}" apunta a la categoría "${t.data.categoria.id}", que no existe`);
    }
  }
  return cats
    .sort((a, b) => a.data.orden - b.data.orden)
    .map((cat) => ({ cat, tracks: ts.filter((t) => t.data.categoria?.id === cat.id) }));
}

/** Tracks sin categoría, que se listan sueltos. */
export async function tracksSueltos(): Promise<Track[]> {
  return (await getTracks()).filter((t) => !t.data.categoria);
}

// `leccionesDe` se llama unas 10.300 veces por build (una por lección desde
// GuideLayout, otra desde Sidebar, más las páginas de track y la portada) y
// `getCollection` construye el array de 5074 entradas en cada llamada.
const cacheLecciones = new Map<string, CollectionEntry<'guia'>[]>();

/** Las lecciones de un track, ya ordenadas por nivel y orden. */
export async function leccionesDe(trackId: string): Promise<CollectionEntry<'guia'>[]> {
  const yaEsta = cacheLecciones.get(trackId);
  if (yaEsta) return yaEsta;
  const ls = (await getCollection('guia', (e) => e.data.subject.id === trackId))
    .sort((a, b) => a.data.level - b.data.level || a.data.order - b.data.order);
  cacheLecciones.set(trackId, ls);
  return ls;
}
