export const SOCKET_X = 12;
export const SOCKET_Z = -58;

export const LADO = 244;
export const MEDIO = LADO / 2;
export const GROSOR = 1.6;

export interface Zona {
  id: string;
  x: number;
  z: number;
  an: number;
  pr: number;
  al: number;
  tipo: 'carcasa' | 'disipador' | 'cpu' | 'ranura' | 'placa' | 'bloque';
  rotulo?: string;
}

export function zona(id: string): Zona | undefined {
  return ZONAS.find((s) => s.id === id);
}

export function huella(s: Zona): { x: number; z: number; an: number; pr: number } {
  if (s.tipo !== 'ranura') return { x: s.x, z: s.z, an: s.an, pr: s.pr };
  const alLargo = s.pr > s.an;
  const crece = 7;
  return alLargo
    ? { x: s.x, z: s.z, an: s.an, pr: s.pr + crece * 2 }
    : { x: s.x, z: s.z, an: s.an + crece * 2, pr: s.pr };
}

export const ZONAS: readonly Zona[] = [
  { id: 'io', x: -78, z: -107, an: 84, pr: 26, al: 27, tipo: 'carcasa' },

  { id: 'vrm-n', x: 16, z: -108, an: 92, pr: 20, al: 23, tipo: 'disipador' },
  { id: 'vrm-o', x: -26, z: -66, an: 18, pr: 62, al: 23, tipo: 'disipador' },

  { id: 'cpu', x: SOCKET_X, z: SOCKET_Z, an: 37, pr: 37, al: 4.3, tipo: 'cpu', rotulo: 'CPU' },

  { id: 'dimm-a', x: 74, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'A1' },
  { id: 'dimm-b', x: 84, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'A2' },
  { id: 'dimm-c', x: 94, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'B1' },
  { id: 'dimm-d', x: 104, z: -42, an: 6, pr: 108, al: 9, tipo: 'ranura', rotulo: 'B2' },

  { id: 'atx', x: 113, z: 14, an: 12, pr: 52, al: 11, tipo: 'ranura', rotulo: 'ATX_PWR' },

  { id: 'm2-sup', x: -34, z: -6, an: 92, pr: 16, al: 4, tipo: 'placa', rotulo: 'M.2_1' },

  { id: 'pcie16', x: -32, z: 26, an: 100, pr: 8, al: 11, tipo: 'ranura', rotulo: 'PCIEX16' },
  { id: 'm2-inf', x: -34, z: 46, an: 92, pr: 16, al: 4, tipo: 'placa', rotulo: 'M.2_2' },
  { id: 'pcie1', x: -52, z: 66, an: 62, pr: 6, al: 9, tipo: 'ranura', rotulo: 'PCIEX1' },

  { id: 'chipset', x: 68, z: 62, an: 44, pr: 44, al: 6, tipo: 'disipador' },

  { id: 'denso-a', x: 66, z: -100, an: 40, pr: 34, al: 0, tipo: 'bloque' },
  { id: 'denso-b', x: -70, z: -60, an: 44, pr: 50, al: 0, tipo: 'bloque' },
  { id: 'denso-c', x: 40, z: 20, an: 56, pr: 44, al: 0, tipo: 'bloque' },
  { id: 'denso-d', x: -20, z: 98, an: 150, pr: 30, al: 0, tipo: 'bloque' },
  { id: 'denso-e', x: -96, z: 30, an: 36, pr: 90, al: 0, tipo: 'bloque' },
];

export const TALADROS_IDEALES: readonly { x: number; z: number }[] = [
  { x: -115, z: -78 },
  { x: -60, z: -86 },
  { x: 113, z: -95 },
  { x: -115, z: 4 },
  { x: -6, z: 12 },
  { x: 113, z: -26 },
  { x: -115, z: 108 },
  { x: -6, z: 108 },
  { x: 112, z: 108 },
];

export const RADIO_TALADRO = 6;

export const BOBINAS: readonly { x: number; z: number }[] = Array.from(
  { length: 8 },
  (_, i) => ({ x: -12 + i * 10, z: -92 }),
);

export const CONDENSADORES: readonly { x: number; z: number }[] = [
  { x: -46, z: -78 },
  { x: -46, z: -66 },
  { x: -46, z: -54 },
  { x: 72, z: 26 },
  { x: 86, z: 26 },
  { x: 100, z: 26 },
  { x: -88, z: -18 },
  { x: -88, z: -6 },
];

export const RADIO_CONDENSADOR = 3.2;
export const MEDIA_BOBINA = 3.5;

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

export function denso(x: number, z: number): boolean {
  for (const s of ZONAS) {
    if (s.tipo !== 'bloque') continue;
    if (Math.abs(x - s.x) < s.an / 2 && Math.abs(z - s.z) < s.pr / 2) return true;
  }
  return false;
}

export const ocupado = fisico;

export const CABECERAS: readonly { x: number; z: number; pines: number }[] = [
  { x: -84, z: 112, pines: 5 },
  { x: -58, z: 112, pines: 9 },
  { x: -20, z: 112, pines: 4 },
  { x: 2, z: 112, pines: 9 },
  { x: 40, z: 112, pines: 5 },
  { x: 62, z: 112, pines: 4 },
  { x: 96, z: 96, pines: 6 },
];

export const PASO_PIN_CABECERA = 2.54;

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

export const PILA = { x: -101, z: 90, r: 10 } as const;

export function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
