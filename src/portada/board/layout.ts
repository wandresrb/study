// El plano de la placa.
//
// Unidades = milímetros, y la placa es una micro-ATX real: 244 x 244. Mantener
// las proporciones de verdad es lo que hace que la escena se lea como una
// placa y no como una maqueta: un slot de RAM mide 9 mm de alto sobre un
// sustrato de 1,6 mm, y esa desproporción es justamente la silueta.
//
// Este fichero es la única fuente del plano: lo consumen la textura (para la
// serigrafía y para no rutear por encima de las zonas) y la geometría.

/** Centro del procesador. Lo consumen el plano y la geometría. */
export const SOCKET_X = 12;
export const SOCKET_Z = -58;

export const LADO = 244;
export const MEDIO = LADO / 2;
export const GROSOR = 1.6;

/** −Z es el borde de entradas y salidas; +Z es el frente de la placa. */
export interface Zona {
  id: string;
  /** Centro. */
  x: number;
  z: number;
  /** Huella. */
  an: number;
  pr: number;
  /** Altura sobre el sustrato. */
  al: number;
  tipo: 'carcasa' | 'disipador' | 'cpu' | 'ranura' | 'placa' | 'bloque';
  /** Rótulo de serigrafía, si lleva. */
  rotulo?: string;
}

/**
 * Huella real de una zona, pestillo incluido. Las ranuras llevan un pestillo
 * que sobresale por un extremo, y no estaba contado en ninguna prueba de
 * colisión: por eso los taladros se veían pisando la memoria aunque el test
 * dijera que estaban libres.
 */
export function huella(s: Zona): { x: number; z: number; an: number; pr: number } {
  if (s.tipo !== 'ranura') return { x: s.x, z: s.z, an: s.an, pr: s.pr };
  const alLargo = s.pr > s.an;
  const crece = 7;
  return alLargo
    ? { x: s.x, z: s.z, an: s.an, pr: s.pr + crece * 2 }
    : { x: s.x, z: s.z, an: s.an + crece * 2, pr: s.pr };
}

export const ZONAS: readonly Zona[] = [
  // Carcasa del panel trasero, en la esquina de siempre.
  { id: 'io', x: -78, z: -107, an: 84, pr: 26, al: 27, tipo: 'carcasa' },

  // Alimentación del procesador: dos bloques con aletas en ele.
  { id: 'vrm-n', x: 16, z: -108, an: 92, pr: 20, al: 23, tipo: 'disipador' },
  { id: 'vrm-o', x: -26, z: -66, an: 18, pr: 62, al: 23, tipo: 'disipador' },

  // El procesador, instalado. Cuadrado y centrado: la huella es el sustrato,
  // sin desplazamientos, porque no sobresale nada por ningún lado.
  { id: 'cpu', x: SOCKET_X, z: SOCKET_Z, an: 37, pr: 37, al: 4.3, tipo: 'cpu', rotulo: 'CPU' },

  // Cuatro ranuras de memoria en paralelo. La repetición es señal de placa.
  { id: 'dimm-a', x: 74, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'A1' },
  { id: 'dimm-b', x: 84, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'A2' },
  { id: 'dimm-c', x: 94, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'B1' },
  { id: 'dimm-d', x: 104, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'B2' },

  // Conector de 24 vías, en el canto derecho.
  { id: 'atx', x: 113, z: 14, an: 12, pr: 52, al: 11, tipo: 'ranura', rotulo: 'ATX_PWR' },

  { id: 'm2-sup', x: -34, z: -6, an: 92, pr: 16, al: 4, tipo: 'placa', rotulo: 'M.2_1' },

  // Ranuras de expansión, paralelas al borde inferior.
  { id: 'pcie16', x: -32, z: 26, an: 100, pr: 8, al: 11, tipo: 'ranura', rotulo: 'PCIEX16' },
  { id: 'm2-inf', x: -34, z: 46, an: 92, pr: 16, al: 4, tipo: 'placa', rotulo: 'M.2_2' },
  { id: 'pcie1', x: -52, z: 66, an: 62, pr: 6, al: 9, tipo: 'ranura', rotulo: 'PCIEX1' },

  // Chipset, bajo su tapa.
  { id: 'chipset', x: 68, z: 62, an: 44, pr: 44, al: 6, tipo: 'disipador' },

  // Bloques densos de componente pequeño. No son piezas: son las regiones que
  // el generador rellena de pasivos.
  { id: 'denso-a', x: 66, z: -100, an: 40, pr: 34, al: 0, tipo: 'bloque' },
  { id: 'denso-b', x: -70, z: -60, an: 44, pr: 50, al: 0, tipo: 'bloque' },
  { id: 'denso-c', x: 40, z: 20, an: 56, pr: 44, al: 0, tipo: 'bloque' },
  { id: 'denso-d', x: -20, z: 98, an: 150, pr: 30, al: 0, tipo: 'bloque' },
  { id: 'denso-e', x: -96, z: 30, an: 36, pr: 90, al: 0, tipo: 'bloque' },
];

/**
 * Posiciones IDEALES de los nueve taladros de una micro-ATX. Las definitivas
 * las resuelve `agujeros.ts`, que aparta la que caiga sobre algo.
 */
export const TALADROS_IDEALES: readonly { x: number; z: number }[] = [
  { x: -115, z: -78 },
  { x: -6, z: -92 },
  { x: 112, z: -95 },
  { x: -115, z: 4 },
  { x: -6, z: 12 },
  { x: 112, z: -22 },
  { x: -115, z: 108 },
  { x: -6, z: 108 },
  { x: 112, z: 108 },
];

/** Radio libre alrededor de un taladro. Ahí no va ni pieza ni pista. */
export const RADIO_TALADRO = 6;

/**
 * La fila de bobinas de la alimentación, pegada al disipador del VRM. Es un
 * rasgo tan característico de una placa como los slots de memoria, y va a mano
 * porque su sitio no es negociable: van en fila, iguales y juntas.
 */
export const BOBINAS: readonly { x: number; z: number }[] = Array.from(
  { length: 8 },
  (_, i) => ({ x: -12 + i * 10, z: -92 }),
);

/**
 * Condensadores electrolíticos. Van en el plano —y no sueltos en la geometría—
 * porque todo lo que ocupa sitio tiene que poder consultarse: un taladro que no
 * los ve acaba clavado en uno.
 */
export const CONDENSADORES: readonly { x: number; z: number }[] = [
  { x: -46, z: -78 },
  { x: -46, z: -66 },
  { x: -46, z: -54 },
  { x: 72, z: 26 },
  { x: 86, z: 26 },
  { x: 100, z: 26 },
  { x: -88, z: -18 },
  { x: -88, z: -6 },
  // NO va ninguna columna en el hueco entre el disipador del VRM y el socket:
  // son 10 mm y un electrolítico mide 6,4, así que cabe sobre el papel pero
  // visualmente se monta sobre las aletas.
];

/** Radio de un electrolítico y media diagonal de una bobina. */
export const RADIO_CONDENSADOR = 3.2;
export const MEDIA_BOBINA = 3.5;

// Hay que distinguir dos cosas que antes se confundían, y de esa confusión
// salían pasivos brotando encima de los disipadores y de las ranuras:
//
//   · físico — ahí YA hay una pieza. No cabe nada más.
//   · denso  — ahí es donde se agolpa el componente pequeño.
//
// Las zonas de tipo 'bloque' son densas y no son físicas: no se dibuja nada
// para ellas, solo marcan dónde tiene sentido que haya pasivos.

/** ¿Hay ya una pieza en ese punto? Los taladros los lleva `agujeros.ts`. */
export function fisico(x: number, z: number, margen = 0): boolean {
  for (const s of ZONAS) {
    if (s.tipo === 'bloque') continue;
    const h = huella(s);
    if (Math.abs(x - h.x) < h.an / 2 + margen && Math.abs(z - h.z) < h.pr / 2 + margen) return true;
  }
  for (const b of BOBINAS) {
    if (Math.abs(x - b.x) < MEDIA_BOBINA + margen && Math.abs(z - b.z) < MEDIA_BOBINA + margen) {
      return true;
    }
  }
  for (const c of CONDENSADORES) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < (RADIO_CONDENSADOR + margen) ** 2) return true;
  }
  for (const b of INDUCTORES) {
    if (Math.abs(x - b.x) < 4 + margen && Math.abs(z - b.z) < 4 + margen) return true;
  }
  for (const d of DIODOS) {
    if (Math.abs(x - d.x) < 4.5 + margen && Math.abs(z - d.z) < 4.5 + margen) return true;
  }
  return false;
}

/** ¿Está en una de las regiones donde se agolpa el componente pequeño? */
export function denso(x: number, z: number): boolean {
  for (const s of ZONAS) {
    if (s.tipo !== 'bloque') continue;
    if (Math.abs(x - s.x) < s.an / 2 && Math.abs(z - s.z) < s.pr / 2) return true;
  }
  return false;
}

/** Reserva para la textura: no se dibuja ni pista ni vía sobre una pieza. */
export const ocupado = fisico;


/**
 * Cabeceras de pines del borde inferior. Es de lo más reconocible de la mitad
 * de abajo de cualquier placa: hileras de contactos cuadrados, a paso fijo, en
 * grupos separados. `pines` es por hilera; todas llevan dos hileras.
 */
export const CABECERAS: readonly { x: number; z: number; pines: number }[] = [
  { x: -84, z: 112, pines: 5 },
  { x: -58, z: 112, pines: 9 },
  { x: -20, z: 112, pines: 4 },
  { x: 2, z: 112, pines: 9 },
  { x: 40, z: 112, pines: 5 },
  { x: 62, z: 112, pines: 4 },
  { x: 96, z: 96, pines: 6 },
];

/** Paso entre contactos de cabecera. */
export const PASO_PIN_CABECERA = 2.54;


/**
 * Bobinas apantalladas y diodos axiales. Son las dos piezas metálicas sueltas
 * que más se repiten en una placa y las que dan casi todo el destello: la
 * bobina es un cubo de ferrita con la tapa metálica y el diodo un barrilito
 * oscuro con dos patillas brillantes.
 */
export const INDUCTORES: readonly { x: number; z: number }[] = [
  { x: 100, z: 74 }, { x: 100, z: 88 }, { x: 30, z: 58 },
  { x: -70, z: 84 }, { x: 30, z: 34 }, { x: -74, z: -20 },
  { x: -80, z: -70 }, { x: -80, z: -48 },
];

export const DIODOS: readonly { x: number; z: number; giro: 0 | 1 }[] = [
  { x: 100, z: 58, giro: 1 }, { x: 22, z: 76, giro: 0 },
  { x: -62, z: 8, giro: 0 }, { x: 44, z: -6, giro: 1 },
  { x: -104, z: 46, giro: 1 }, { x: 66, z: 100, giro: 0 },
];

/** La pila de botón. Redonda, grande y plateada: no se confunde con nada. */
export const PILA = { x: -101, z: 90, r: 10 } as const;

/** Congruencial lineal. La placa tiene que ser idéntica en cada carga. */
export function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
