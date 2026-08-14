import { azar, fisico, ZONAS } from './layout';

export type Punto = readonly [number, number];

export interface Haz {
  pistas: Punto[][];
  eje: Punto[];
  ancho: number;
}

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
  horizontal: boolean;
}

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

function borde(
  id: string,
  lado: 'n' | 's' | 'e' | 'o',
  t = 0,
  adentro = 0,
  respaldo?: Punto,
): Punto {
  const z = ZONAS.find((s) => s.id === id);
  if (!z) {
    if (respaldo) return respaldo;
    throw new Error(`zona desconocida y sin respaldo: ${id}`);
  }
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

const BAJO_CPU = 2;

export function buses(): Haz[] {
  return [
    haz({ desde: borde('cpu', 'e', -12, BAJO_CPU), hasta: borde('dimm-a', 'o', -24), n: 16, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('cpu', 'e', 12, BAJO_CPU), hasta: borde('dimm-a', 'o', 26), n: 16, paso: 0.85, ancho: 0.3, horizontal: true }),

    haz({ desde: borde('cpu', 's', -6, BAJO_CPU), hasta: borde('pcie16', 'n', 32), n: 14, paso: 0.85, ancho: 0.3, horizontal: false }),

    haz({ desde: borde('cpu', 'o', -14, BAJO_CPU), hasta: borde('io', 'e', 6), n: 10, paso: 0.9, ancho: 0.3, horizontal: true }),

    haz({ desde: borde('chipset', 'o', -4), hasta: borde('m2-inf', 'e', 0), n: 10, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('chipset', 'o', 8), hasta: borde('pcie1', 'e', 0), n: 8, paso: 0.85, ancho: 0.3, horizontal: true }),
    haz({ desde: borde('chipset', 's', -8), hasta: [40, 108], n: 12, paso: 0.8, ancho: 0.28, horizontal: false }),
    haz({ desde: borde('chipset', 'n', 0), hasta: borde('m2-sup', 'e', 4), n: 8, paso: 0.9, ancho: 0.3, horizontal: true }),

    haz({ desde: borde('atx', 'n', -9), hasta: borde('vrm-n', 'e', 2), n: 3, paso: 2.2, ancho: 1.4, horizontal: false }),
    haz({ desde: borde('vrm-n', 's', -8), hasta: borde('cpu', 'n', 4, BAJO_CPU), n: 4, paso: 2.4, ancho: 1.4, horizontal: false }),
  ];
}

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
  const DENTRO = 1.6;

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
