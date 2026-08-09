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

// Solo del plano. `agujeros.ts` importa de aquí, así que pedirle `enTaladro`
// cerraría el ciclo: el recorte de taladros del abanico lo hace `mascara.ts`,
// que ya importa los dos módulos.
import { azar, fisico, ZONAS } from './layout';

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
function borde(
  id: string,
  lado: 'n' | 's' | 'e' | 'o',
  t = 0,
  adentro = 0,
  respaldo?: Punto,
): Punto {
  const z = ZONAS.find((s) => s.id === id);
  if (!z) {
    // Sin respaldo esto lanzaba, y quitar una zona del plano tumbaba la placa
    // entera en tiempo de ejecución: no es aceptable que retirar una pieza
    // impida cargar la portada.
    if (respaldo) return respaldo;
    throw new Error(`zona desconocida y sin respaldo: ${id}`);
  }
  // `adentro` mete el extremo bajo la pieza. Una pista que muere justo en el
  // canto deja una holgura de antialias y se lee como que no llega; metida dos
  // milímetros, desaparece bajo el encapsulado, que es lo que hace de verdad.
  switch (lado) {
    case 'n':
      return [z.x + t, z.z - z.pr / 2 + adentro];
    case 's':
      return [z.x + t, z.z + z.pr / 2 - adentro];
    case 'o':
      return [z.x - z.an / 2 + adentro, z.z + t];
    default:
      return [z.x + z.an / 2 - adentro, z.z + t];
  }
}

/**
 * Los haces de la placa. Cada uno une dos componentes de verdad, y lleva la
 * cuenta de pistas que le tocaría: la memoria mueve muchas más líneas que un
 * enlace de expansión, y eso se ve.
 */
/**
 * Cuánto se meten los extremos bajo el encapsulado del procesador.
 *
 * Los cuatro bordes del CPU estuvieron escritos a mano —de cuando no había
 * pieza montada ahí— y se quedaron así al volver el procesador: los cinco haces
 * que dicen converger en él morían en laminado desnudo, hasta 9,5 mm cortos por
 * el costado este. Ahora salen de la zona, como los de cualquier otra pieza.
 */
const BAJO_CPU = 2;

export function buses(): Haz[] {
  return [
    // Procesador → memoria, los dos canales. Es el haz más ancho de la placa.
    haz({ desde: borde('cpu', 'e', -12, BAJO_CPU), hasta: borde('dimm-a', 'o', -24), n: 16, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('cpu', 'e', 12, BAJO_CPU), hasta: borde('dimm-a', 'o', 26), n: 16, paso: 0.85, ancho: 0.3, horizontal: true }),

    // Procesador → ranura de expansión principal.
    haz({ desde: borde('cpu', 's', -6, BAJO_CPU), hasta: borde('pcie16', 'n', 32), n: 14, paso: 0.85, ancho: 0.3, horizontal: false }),

    // Procesador → panel trasero.
    haz({ desde: borde('cpu', 'o', -14, BAJO_CPU), hasta: borde('io', 'e', 6), n: 10, paso: 0.9, ancho: 0.3, horizontal: true }),

    // Chipset → almacenamiento y expansión.
    haz({ desde: borde('chipset', 'o', -4), hasta: borde('m2-inf', 'e', 0), n: 10, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('chipset', 'o', 8), hasta: borde('pcie1', 'e', 0), n: 8, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('chipset', 's', -8), hasta: [40, 108], n: 12, paso: 0.8, ancho: 0.28, horizontal: false }),
    haz({ desde: borde('chipset', 'n', 0), hasta: borde('m2-sup', 'e', 4), n: 8, paso: 0.9, ancho: 0.3, horizontal: true }),

    // Alimentación: pocas pistas y mucho más gruesas.
    //
    // Subía por el canto derecho, por x ≈ 111. Ninguna placa rutea por ahí: el
    // canto es donde apoyan los separadores, y ese haz sellaba los quince
    // milímetros del lado derecho — dos de los nueve taladros se quedaban sin
    // sitio por él, uno se descartaba en silencio.
    //
    // Sacarlo por el oeste del conector fue peor: le cruzaba a la placa el
    // centro con un manchón de pista gruesa. Va donde va en una placa de
    // verdad: BAJO la última ranura de memoria, escondido por el cuerpo del
    // conector, y por encima de las ranuras hasta el VRM. Tres pistas en vez de
    // cinco, que es lo que cabe en ese pasillo.
    haz({ desde: borde('atx', 'n', -9), hasta: borde('vrm-n', 'e', 2), n: 3, paso: 2.2, ancho: 1.4, horizontal: false }),
    // El `t = 4` no es adorno: pone el extremo del CPU en x = 16, que es donde
    // sale el del VRM, y así el tramo baja recto en vez de doblar en el último
    // milímetro.
    haz({ desde: borde('vrm-n', 's', -8), hasta: borde('cpu', 'n', 4, BAJO_CPU), n: 4, paso: 2.4, ancho: 1.4, horizontal: false }),
  ];
}

/**
 * El abanico de salida del procesador.
 *
 * Un CPU no se lee como conectado por cinco haces gordos: se lee por la corona
 * de pistas cortas que asoma bajo TODO el perímetro del encapsulado y muere en
 * una vía a los pocos milímetros. Es por donde escapan de verdad las señales de
 * un encapsulado con mil setecientos contactos, y sin ella el chip parece
 * apoyado en la placa en vez de soldado a ella.
 *
 * No entra en `buses()` a propósito. Los buses reservan sitio y se encienden;
 * esto es dibujo de máscara y nada más. Como haz reservaría media zona del
 * procesador y `pulsos.ts` levantaría un centenar de cintas luminosas de tres
 * milímetros — ruido, no señal.
 */
export interface Abanico {
  pistas: Punto[][];
  vias: Punto[];
}

export function abanicoCpu(): Abanico {
  const z = ZONAS.find((s) => s.id === 'cpu');
  if (!z) return { pistas: [], vias: [] };

  const rnd = azar(0x0cfa11);
  const pistas: Punto[][] = [];
  const vias: Punto[] = [];
  const PASO = 1.1;
  /** Arranca bajo el encapsulado; lo que se ve empieza en el canto. */
  const DENTRO = 1.6;

  // Los lados, cada uno con su normal hacia fuera.
  const lados: { fijo: number; eje: 'x' | 'z'; n: -1 | 1 }[] = [
    { fijo: z.z - z.pr / 2, eje: 'x', n: -1 },
    { fijo: z.z + z.pr / 2, eje: 'x', n: 1 },
    { fijo: z.x - z.an / 2, eje: 'z', n: -1 },
    { fijo: z.x + z.an / 2, eje: 'z', n: 1 },
  ];

  for (const lado of lados) {
    const largo = lado.eje === 'x' ? z.an : z.pr;
    const centro = lado.eje === 'x' ? z.x : z.z;
    const n = Math.floor((largo - 3) / PASO);

    for (let i = 0; i <= n; i++) {
      const t = centro + (i - n / 2) * PASO;
      // Las vías se escalonan en tres filas. Alineadas en una sola forman una
      // raya continua, que es justo lo que no hace una placa.
      const salida = 2.2 + (i % 3) * 1.3 + rnd() * 0.5;

      const a: Punto =
        lado.eje === 'x'
          ? [t, lado.fijo - lado.n * DENTRO]
          : [lado.fijo - lado.n * DENTRO, t];
      const b: Punto =
        lado.eje === 'x' ? [t, lado.fijo + lado.n * salida] : [lado.fijo + lado.n * salida, t];

      if (fisico(b[0], b[1], 0.6)) continue;
      pistas.push([a, b]);
      vias.push(b);
    }
  }

  return { pistas, vias };
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
