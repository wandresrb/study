// Los buses.
//
// En una placa real las pistas son diminutas —de dos a tres décimas de
// milímetro— y van casi todas escondidas bajo la máscara. Van en haces: veinte
// o treinta líneas paralelas que unen dos zonas, con los codos a 45°, nunca a
// escuadra.
//
// Por eso aquí no son geometría: a este tamaño una pista mide dos o tres
// píxeles y como malla sería subpíxel o mentira. Se dibujan en la textura de la
// placa. Lo que sí es geometría son las luces que viajan por ellas, y para eso
// este módulo devuelve además el recorrido de cada haz.

import { ZONAS } from './layout';

export type Punto = readonly [number, number];

export interface Haz {
  /** Una polilínea por pista, en coordenadas de placa (milímetros). */
  pistas: Punto[][];
  /** Eje central del haz: por aquí viajan las luces. */
  eje: Punto[];
  ancho: number;
}

/** Sustituye una esquina en escuadra por un bisel de 45°. */
function biselar(camino: Punto[], corte: number): Punto[] {
  if (camino.length < 3) return camino;
  const out: Punto[] = [camino[0]];
  for (let i = 1; i < camino.length - 1; i++) {
    const [px, pz] = camino[i - 1];
    const [cx, cz] = camino[i];
    const [nx, nz] = camino[i + 1];

    const d1 = Math.hypot(cx - px, cz - pz);
    const d2 = Math.hypot(nx - cx, nz - cz);
    const c = Math.min(corte, d1 * 0.45, d2 * 0.45);
    if (c < 0.05) {
      out.push(camino[i]);
      continue;
    }
    out.push([cx - ((cx - px) / d1) * c, cz - ((cz - pz) / d1) * c]);
    out.push([cx + ((nx - cx) / d2) * c, cz + ((nz - cz) / d2) * c]);
  }
  out.push(camino[camino.length - 1]);
  return out;
}

interface Peticion {
  desde: Punto;
  hasta: Punto;
  n: number;
  paso: number;
  ancho: number;
  /** Si el primer tramo es horizontal. */
  horizontal: boolean;
}

/**
 * Un haz entre dos puntos. El desplazamiento de cada pista se aplica sobre el
 * eje perpendicular a cada tramo, que es lo que mantiene las líneas paralelas
 * y sin cruzarse a lo largo de todo el recorrido.
 */
function haz(p: Peticion): Haz {
  const [ax, az] = p.desde;
  const [bx, bz] = p.hasta;
  const centro = (p.n - 1) / 2;
  const pistas: Punto[][] = [];

  for (let i = 0; i < p.n; i++) {
    const o = (i - centro) * p.paso;
    const bruto: Punto[] = p.horizontal
      ? [
          [ax, az + o],
          [bx + o, az + o],
          [bx + o, bz],
        ]
      : [
          [ax + o, az],
          [ax + o, bz + o],
          [bx, bz + o],
        ];
    pistas.push(biselar(bruto, 3.2));
  }

  return { pistas, eje: pistas[centro | 0], ancho: p.ancho };
}

/**
 * Un punto sobre el borde de una zona del plano, desplazado `t` a lo largo de
 * ese borde. Los extremos de los haces se sacan de aquí y no a mano: un bus que
 * arranca o muere en mitad de la nada delata que el ruteo es decorativo.
 */
function borde(id: string, lado: 'n' | 's' | 'e' | 'o', t = 0, respaldo?: Punto): Punto {
  const z = ZONAS.find((s) => s.id === id);
  if (!z) {
    // Sin respaldo esto lanzaba, y quitar una zona del plano tumbaba la placa
    // entera en tiempo de ejecución: no es aceptable que retirar una pieza
    // impida cargar la portada.
    if (respaldo) return respaldo;
    throw new Error(`zona desconocida y sin respaldo: ${id}`);
  }
  switch (lado) {
    case 'n':
      return [z.x + t, z.z - z.pr / 2];
    case 's':
      return [z.x + t, z.z + z.pr / 2];
    case 'o':
      return [z.x - z.an / 2, z.z + t];
    default:
      return [z.x + z.an / 2, z.z + t];
  }
}

/**
 * Los haces de la placa. Cada uno une dos componentes de verdad, y lleva la
 * cuenta de pistas que le tocaría: la memoria mueve muchas más líneas que un
 * enlace de expansión, y eso se ve.
 */
/**
 * El área del procesador. Ya no hay pieza montada ahí, pero sigue siendo el
 * punto del que salen los haces principales: en una placa todo converge en el
 * procesador, y unos buses que no fueran a ninguna parte se notarían.
 *
 * Va a mano y no con `borde()` precisamente porque no existe la zona. Si algún
 * día vuelve a haber socket, estos cuatro puntos son sus bordes.
 */
const CPU = {
  este: [40, -58] as Punto,
  oeste: [-8, -58] as Punto,
  norte: [16, -82] as Punto,
  sur: [16, -34] as Punto,
};

export function buses(): Haz[] {
  return [
    // Procesador → memoria, los dos canales. Es el haz más ancho de la placa.
    haz({ desde: [CPU.este[0], CPU.este[1] - 12], hasta: borde('dimm-a', 'o', -24), n: 16, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: [CPU.este[0], CPU.este[1] + 12], hasta: borde('dimm-a', 'o', 26), n: 16, paso: 0.85, ancho: 0.3, horizontal: true }),

    // Procesador → ranura de expansión principal.
    haz({ desde: [CPU.sur[0] - 6, CPU.sur[1]], hasta: borde('pcie16', 'n', 32), n: 14, paso: 0.85, ancho: 0.3, horizontal: false }),

    // Procesador → panel trasero.
    haz({ desde: [CPU.oeste[0], CPU.oeste[1] - 14], hasta: borde('io', 'e', 6), n: 10, paso: 0.9, ancho: 0.3, horizontal: true }),

    // Chipset → almacenamiento y expansión.
    haz({ desde: borde('chipset', 'o', -4), hasta: borde('m2-inf', 'e', 0), n: 10, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('chipset', 'o', 8), hasta: borde('pcie1', 'e', 0), n: 8, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('chipset', 's', -8), hasta: [40, 108], n: 12, paso: 0.8, ancho: 0.28, horizontal: false }),
    haz({ desde: borde('chipset', 'n', 0), hasta: borde('m2-sup', 'e', 4), n: 8, paso: 0.9, ancho: 0.3, horizontal: true }),

    // Alimentación: pocas pistas y mucho más gruesas. Rodean las ranuras de
    // memoria por arriba, que es por donde hay sitio.
    haz({ desde: borde('atx', 'n', -2), hasta: borde('vrm-n', 'e', 2), n: 5, paso: 2.6, ancho: 1.5, horizontal: false }),
    haz({ desde: borde('vrm-n', 's', 0), hasta: CPU.norte, n: 4, paso: 2.4, ancho: 1.4, horizontal: false }),
  ];
}

/**
 * Rejilla de reserva de los buses, a 1 mm por celda.
 *
 * Un pasivo plantado encima de un haz lo parte visualmente, y cuando el haz se
 * enciende el destrozo se ve el doble. En una placa real el ruteo y la
 * colocación se pelean por el sitio y gana el ruteo: por debajo de un
 * componente puede pasar una pista, pero no una veintena en paralelo.
 */
export function reservaBuses(margen: number): (x: number, z: number) => boolean {
  const LADO = 244;
  const MEDIO = LADO / 2;
  const rejilla = new Uint8Array(LADO * LADO);

  const marcar = (x: number, z: number, r: number) => {
    const cx = Math.round(x + MEDIO);
    const cz = Math.round(z + MEDIO);
    const ri = Math.ceil(r);
    for (let dz = -ri; dz <= ri; dz++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dz * dz > r * r) continue;
        const gx = cx + dx;
        const gz = cz + dz;
        if (gx < 0 || gx >= LADO || gz < 0 || gz >= LADO) continue;
        rejilla[gz * LADO + gx] = 1;
      }
    }
  };

  for (const h of buses()) {
    const r = h.ancho / 2 + margen;
    for (const pista of h.pistas) {
      for (let i = 1; i < pista.length; i++) {
        const [x0, z0] = pista[i - 1];
        const [x1, z1] = pista[i];
        const largo = Math.hypot(x1 - x0, z1 - z0);
        const pasos = Math.max(1, Math.ceil(largo * 2));
        for (let k = 0; k <= pasos; k++) {
          const t = k / pasos;
          marcar(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, r);
        }
      }
    }
  }

  return (x, z) => {
    const gx = Math.round(x + MEDIO);
    const gz = Math.round(z + MEDIO);
    if (gx < 0 || gx >= LADO || gz < 0 || gz >= LADO) return false;
    return rejilla[gz * LADO + gx] === 1;
  };
}
