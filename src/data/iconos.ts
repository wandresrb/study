import { createRequire } from 'node:module';
import { join } from 'node:path';

// Los sets de Iconify son DATOS, no código: simple-icons son 4,77 MB de JSON.
// Se leen con `require` y no con `import` a propósito. Con un import, Vite los
// mete en el grafo de módulos y eso tiene dos precios: el JSON entero acaba
// dentro del bundle de prerender, y su código entra en el hash de dependencias
// de todas las páginas que lo alcanzan. Leídos por fuera del grafo no cuestan
// ni un byte de bundle.
//
// Que queden fuera del hash de dependencias NO los deja sin invalidar: añadir o
// subir de versión un @iconify-json cambia `bun.lock`, y Astro tira el manifest
// incremental entero cuando el hash del lockfile no coincide.
//
// El ancla es `process.cwd()` y no `import.meta.url`: durante `astro build` este
// módulo se ejecuta desde el bundle temporal de prerender, cuya URL no sirve
// para resolver dependencias del proyecto. `cwd` es la raíz en dev y en build.
const requerir = createRequire(join(process.cwd(), 'package.json'));

/**
 * La forma REAL de `@iconify-json/<set>/icons.json`, comprobada sobre los dos
 * paquetes instalados: la raíz lleva `prefix`, `width`, `height` y
 * `lastModified`; una entrada solo lleva `body` (más `width`/`height`/`hidden`
 * cuando se sale de la rejilla del set), y un alias solo `parent`, sin rotate
 * ni flip. Ninguno de los dos declara `left`/`top`, así que el origen del
 * viewBox es siempre 0 0.
 *
 * Y ningún cuerpo usa `id=` ni `url(#…)`: por eso el mismo SVG se puede
 * incrustar N veces en una página sin que colisionen las referencias. No es
 * cierto en sets como `logos` o `flat-color-icons`, así que si algún día se
 * añade uno, hay que volver a comprobarlo antes.
 */
interface SetIconify {
  prefix: string;
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number; hidden?: boolean }>;
  aliases?: Record<string, { parent: string }>;
}

const SETS = {
  lucide: '@iconify-json/lucide/icons.json',
  'simple-icons': '@iconify-json/simple-icons/icons.json',
} as const;

type Prefijo = keyof typeof SETS;

// Mismo patrón que `cacheLecciones` en contenido.ts y por el mismo motivo: se
// resuelven unos 15.000 iconos por build y el JSON solo se parsea una vez. Es
// seguro con `experimental.incrementalBuild` porque lo que se guarda es una
// constante del paquete instalado, no algo que dependa de qué página se está
// renderizando.
const cargados = new Map<Prefijo, SetIconify>();

function cargar(prefijo: Prefijo): SetIconify {
  const ya = cargados.get(prefijo);
  if (ya) return ya;
  const datos = requerir(SETS[prefijo]) as SetIconify;
  cargados.set(prefijo, datos);
  return datos;
}

export interface Glifo {
  body: string;
  viewBox: string;
  /** `trazo` (lucide) se dibuja con stroke; `relleno` (simple-icons) con fill. */
  modo: 'trazo' | 'relleno';
}

/** `lucide:cpu`, `simple-icons:rust`. Nada más. */
export const FORMATO = /^(?:lucide|simple-icons):[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Una cifra es tipografía legítima: el temario numera los niveles intermedios. */
export const esCifra = (valor: string): boolean => /^\d+$/.test(valor);

/**
 * Resuelve un nombre a su SVG. LANZA si no existe: un icono que falta es un
 * error de datos, y devolver un hueco vacío lo convertiría en un fallo visual
 * repartido por 5074 páginas y ausente de cualquier traza.
 */
export function resolver(nombre: string): Glifo {
  const corte = nombre.indexOf(':');
  const prefijo = nombre.slice(0, corte) as Prefijo;
  if (corte < 1 || !(prefijo in SETS)) {
    throw new Error(
      `Icono "${nombre}": el nombre se declara como "lucide:algo" o "simple-icons:algo".`,
    );
  }
  const id = nombre.slice(corte + 1);
  const datos = cargar(prefijo);
  // Un solo salto: en estos dos sets un alias solo apunta a su `parent`.
  const padre = datos.aliases?.[id]?.parent;
  const icono = datos.icons[id] ?? (padre !== undefined ? datos.icons[padre] : undefined);
  if (!icono) {
    throw new Error(
      `El icono "${nombre}" no existe en @iconify-json/${prefijo} ` +
        `(${Object.keys(datos.icons).length} iconos). ` +
        `Busca el nombre exacto en https://icones.js.org/collection/${prefijo}`,
    );
  }
  // Precedencia de la spec de Iconify: el icono manda sobre el set, y el set
  // sobre el 16 por defecto. Hoy solo `lucide:search-large` (32x32) se sale del
  // 24 de su set, pero se resuelve en general para no atarse a esa casualidad.
  const w = icono.width ?? datos.width ?? 16;
  const h = icono.height ?? datos.height ?? 16;
  return {
    body: icono.body,
    viewBox: `0 0 ${w} ${h}`,
    modo: prefijo === 'simple-icons' ? 'relleno' : 'trazo',
  };
}

/**
 * Para el schema: comprueba forma Y existencia. El regex por sí solo rechaza el
 * emoji viejo pero deja pasar `lucide:cpuu`, que reventaría mucho más tarde, al
 * renderizar una de 5074 páginas y sin decir qué entrada lo declaraba.
 */
export function existe(nombre: string): boolean {
  if (!FORMATO.test(nombre)) return false;
  try {
    resolver(nombre);
    return true;
  } catch {
    return false;
  }
}
