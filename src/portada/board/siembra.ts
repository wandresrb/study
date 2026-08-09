// Dónde va el componente pequeño.
//
// El patrón de una placa real NO es dispersión. Mirando una de cerca se ve
// esto:
//
//   · Los pasivos van en filas apretadas de piezas **idénticas**, todas con la
//     misma orientación y a paso fijo. Nunca sueltos y nunca girados al azar.
//   · Cada fila **abraza a la pieza grande a la que sirve**: la banda de
//     desacoplo pegada al socket, los filtros junto a cada ranura de memoria.
//   · Lo que hace que se lea como placa es la **repetición de un motivo**: un
//     VRM son ocho copias del mismo circuito en fila, no ocho circuitos
//     distintos.
//   · Y entre grupo y grupo, máscara vacía.
//
// Por eso aquí no hay sembrado probabilístico. Hay motivos —fila, bloque,
// isla, fase— anclados a las zonas del plano y repetidos. Lo único aleatorio es
// una pizca de tinte para que una fila no sea un bloque plano de color.

import { azar, BOBINAS, denso, fisico, zona } from './layout';
import { enTaladro } from './agujeros';
import { reservaBuses } from './trazas';

/** Huellas reales, en milímetros. En una placa no hay tamaños intermedios. */
export const HUELLAS = {
  p0402: { an: 1, pr: 0.5, al: 0.35 },
  p0603: { an: 1.6, pr: 0.8, al: 0.45 },
  p0805: { an: 2, pr: 1.25, al: 0.6 },
  sot23: { an: 2.9, pr: 1.3, al: 1.1 },
  /** Encapsulado de potencia: los de las fases del VRM. */
  dfn: { an: 5, pr: 6, al: 1.5 },
  soic: { an: 5, pr: 4, al: 1.2 },
  /** Bobinas de la alimentación. */
  bobina: { an: 7, pr: 7, al: 3.4 },
} as const;

export type Huella = keyof typeof HUELLAS;

export interface Pieza {
  x: number;
  z: number;
  huella: Huella;
  /** 0 = largo a lo largo de X, 1 = largo a lo largo de Z. */
  giro: 0 | 1;
  t: number;
}

// --- Motivos ---------------------------------------------------------------

/** Fila de piezas idénticas. `giro` es la orientación de la pieza, no la fila. */
function fila(
  x0: number,
  z0: number,
  dx: number,
  dz: number,
  n: number,
  huella: Huella,
  giro: 0 | 1,
): Pieza[] {
  const out: Pieza[] = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + dx * i, z: z0 + dz * i, huella, giro, t: 0 });
  return out;
}

/** Retícula de piezas idénticas: el bloque de filtrado de siempre. */
function bloque(
  x0: number,
  z0: number,
  cols: number,
  filas: number,
  px: number,
  pz: number,
  huella: Huella,
  giro: 0 | 1,
): Pieza[] {
  const out: Pieza[] = [];
  for (let c = 0; c < cols; c++) {
    for (let f = 0; f < filas; f++) {
      out.push({ x: x0 + c * px, z: z0 + f * pz, huella, giro, t: 0 });
    }
  }
  return out;
}

/** Un integrado con su corte de pasivos alrededor. Siempre la misma figura. */
function isla(cx: number, cz: number): Pieza[] {
  return [
    { x: cx, z: cz, huella: 'soic', giro: 0, t: 0 },
    ...fila(cx - 3.6, cz - 3.4, 1.8, 0, 5, 'p0402', 1),
    ...fila(cx - 3.6, cz + 3.4, 1.8, 0, 5, 'p0402', 1),
    ...fila(cx - 4.6, cz - 1.6, 0, 1.6, 3, 'p0603', 0),
  ];
}

/**
 * Una fase de alimentación: bajo cada bobina, dos encapsulados de potencia y
 * su par de pasivos. Ocho fases son ocho copias exactas de esto — la
 * repetición es el patrón.
 */
function fase(cx: number, cz: number): Pieza[] {
  return [
    { x: cx - 2.6, z: cz + 8, huella: 'dfn', giro: 0, t: 0 },
    { x: cx + 3, z: cz + 8, huella: 'dfn', giro: 0, t: 0 },
    ...fila(cx - 3.4, cz + 13.5, 1.7, 0, 4, 'p0603', 1),
  ];
}

// --- El plano de colocación ------------------------------------------------

function motivos(): Pieza[] {
  const p: Pieza[] = [];

  // Banda de desacoplo bajo el procesador. Es la fila más característica de una
  // placa: muchas piezas iguales, muy juntas, pegadas a su borde.
  //
  // Decía «pegada al borde del socket» y estaba a 9,5 mm de él, porque se
  // escribió a mano y la zona se movió después. Sale del plano: los 5,3 mm son
  // el hueco justo para que pase el abanico de salida sin que se toquen.
  const cpu = zona('cpu');
  if (cpu) {
    const z0 = cpu.z + cpu.pr / 2 + 5.3;
    const x0 = cpu.x - cpu.an / 2 - 3;
    p.push(...fila(x0, z0, 1.8, 0, 25, 'p0402', 1));
    p.push(...fila(x0, z0 + 2.6, 1.8, 0, 25, 'p0402', 1));
  }
  // Y su gemela por el lado de la memoria.
  p.push(...fila(45, -80, 0, 1.8, 24, 'p0402', 0));
  p.push(...fila(47.6, -80, 0, 1.8, 24, 'p0402', 0));

  // Las ocho fases del VRM, una por bobina.
  for (const b of BOBINAS) p.push(...fase(b.x, b.z));

  // Filtrado en el extremo de las ranuras de memoria.
  p.push(...bloque(70, 10, 14, 3, 2.8, 2.2, 'p0603', 1));

  // Junto a la primera ranura de expansión.
  p.push(...fila(-76, 34, 2.4, 0, 34, 'p0603', 1));

  // Alrededor del chipset.
  p.push(...fila(48, 88, 2.6, 0, 16, 'p0603', 1));
  p.push(...fila(42, 44, 0, 2.6, 14, 'p0603', 0));

  // Islas de integrado en las regiones densas. Posiciones fijas, no sorteadas.
  const ISLAS: [number, number][] = [
    [-70, -74], [-70, -58], [-70, -42],
    [30, 6], [46, 6], [30, 24],
    [-100, -2], [-100, 18], [-100, 38], [-100, 58],
    [-62, 96], [-38, 96], [-14, 96], [10, 96], [34, 96],
  ];
  for (const [x, z] of ISLAS) p.push(...isla(x, z));

  // Bloques de filtrado. Cada uno es una retícula regular, como en la foto.
  const BLOQUES: [number, number, number, number][] = [
    [50, -114, 12, 6],
    [-90, -80, 8, 5],
    [16, -6, 10, 5],
    [-88, 62, 8, 6],
    [-84, 104, 20, 3],
    [14, 104, 16, 3],
  ];
  for (const [x, z, cols, filas] of BLOQUES) {
    p.push(...bloque(x, z, cols, filas, 2.6, 2.2, 'p0402', 1));
  }

  // Transistores sueltos, pero en fila y donde hay potencia.
  p.push(...fila(92, -112, 4.2, 0, 6, 'sot23', 1));
  p.push(...fila(-108, -70, 0, 4.2, 7, 'sot23', 0));

  return p;
}

/**
 * Aplica el plano y recorta lo que no cabe. Recortar pieza a pieza —y no fila
 * a fila— es lo que evita que un motivo asome sobre un disipador o parta un
 * haz por la mitad.
 */
export function sembrar(): Pieza[] {
  const rnd = azar(0x51117a3);
  const sobreBus = reservaBuses(1.4);
  const out: Pieza[] = [];

  // Se comprueba la huella entera, no el centro. Un SOIC mide 5 mm: su centro
  // puede caer entre dos pistas y su cuerpo tapar el haz igualmente. Ese era el
  // motivo de que siguieran apareciendo piezas montadas sobre los buses.
  const chocaBus = (pieza: Pieza): boolean => {
    const f = HUELLAS[pieza.huella];
    const hx = (pieza.giro === 1 ? f.pr : f.an) / 2 + 0.5;
    const hz = (pieza.giro === 1 ? f.an : f.pr) / 2 + 0.5;
    for (const dx of [-hx, 0, hx]) {
      for (const dz of [-hz, 0, hz]) {
        if (sobreBus(pieza.x + dx, pieza.z + dz)) return true;
      }
    }
    return false;
  };

  for (const pieza of motivos()) {
    const { x, z } = pieza;
    if (Math.abs(x) > 116 || Math.abs(z) > 116) continue;
    if (fisico(x, z, 1.6) || enTaladro(x, z, 1.4)) continue;
    if (chocaBus(pieza)) continue;
    out.push({ ...pieza, t: rnd() });
  }

  return out;
}

/** Regiones densas sin cubrir por ningún motivo, para depurar el plano. */
export function huecosDensos(piezas: readonly Pieza[]): number {
  let vacias = 0;
  for (let x = -110; x <= 110; x += 10) {
    for (let z = -110; z <= 110; z += 10) {
      if (!denso(x, z) || fisico(x, z, 4)) continue;
      const cerca = piezas.some((p) => Math.abs(p.x - x) < 12 && Math.abs(p.z - z) < 12);
      if (!cerca) vacias++;
    }
  }
  return vacias;
}
