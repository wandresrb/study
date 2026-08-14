export const SOCKET_X = 12;
export const SOCKET_Z = -58;

export const SIDE = 244;
export const HALF = SIDE / 2;
export const THICKNESS = 1.6;

export interface Zone {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: 'shell' | 'heatsink' | 'cpu' | 'slot' | 'board' | 'block';
  label?: string;
}

export function zone(id: string): Zone | undefined {
  return ZONES.find((s) => s.id === id);
}

export function footprint(s: Zone): { x: number; z: number; w: number; d: number } {
  if (s.kind !== 'slot') return { x: s.x, z: s.z, w: s.w, d: s.d };
  const lengthwise = s.d > s.w;
  const grow = 7;
  return lengthwise
    ? { x: s.x, z: s.z, w: s.w, d: s.d + grow * 2 }
    : { x: s.x, z: s.z, w: s.w + grow * 2, d: s.d };
}

export const ZONES: readonly Zone[] = [
  { id: 'io', x: -78, z: -107, w: 84, d: 26, h: 27, kind: 'shell' },

  { id: 'vrm-n', x: 16, z: -108, w: 92, d: 20, h: 23, kind: 'heatsink' },
  { id: 'vrm-w', x: -26, z: -66, w: 18, d: 62, h: 23, kind: 'heatsink' },

  { id: 'cpu', x: SOCKET_X, z: SOCKET_Z, w: 37, d: 37, h: 4.3, kind: 'cpu', label: 'CPU' },

  { id: 'dimm-a', x: 74, z: -42, w: 6, d: 108, h: 9, kind: 'slot', label: 'A1' },
  { id: 'dimm-b', x: 84, z: -42, w: 6, d: 108, h: 9, kind: 'slot', label: 'A2' },
  { id: 'dimm-c', x: 94, z: -42, w: 6, d: 108, h: 9, kind: 'slot', label: 'B1' },
  { id: 'dimm-d', x: 104, z: -42, w: 6, d: 108, h: 9, kind: 'slot', label: 'B2' },

  { id: 'atx', x: 113, z: 14, w: 12, d: 52, h: 11, kind: 'slot', label: 'ATX_PWR' },

  { id: 'm2-top', x: -34, z: -6, w: 92, d: 16, h: 4, kind: 'board', label: 'M.2_1' },

  { id: 'pcie16', x: -32, z: 26, w: 100, d: 8, h: 11, kind: 'slot', label: 'PCIEX16' },
  { id: 'm2-bot', x: -34, z: 46, w: 92, d: 16, h: 4, kind: 'board', label: 'M.2_2' },
  { id: 'pcie1', x: -52, z: 66, w: 62, d: 6, h: 9, kind: 'slot', label: 'PCIEX1' },

  { id: 'chipset', x: 68, z: 62, w: 44, d: 44, h: 6, kind: 'heatsink' },

  { id: 'dense-a', x: 66, z: -100, w: 40, d: 34, h: 0, kind: 'block' },
  { id: 'dense-b', x: -70, z: -60, w: 44, d: 50, h: 0, kind: 'block' },
  { id: 'dense-c', x: 40, z: 20, w: 56, d: 44, h: 0, kind: 'block' },
  { id: 'dense-d', x: -20, z: 98, w: 150, d: 30, h: 0, kind: 'block' },
  { id: 'dense-e', x: -96, z: 30, w: 36, d: 90, h: 0, kind: 'block' },
];

export const IDEAL_HOLES: readonly { x: number; z: number }[] = [
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

export const HOLE_RADIUS = 6;

export const COILS: readonly { x: number; z: number }[] = Array.from(
  { length: 8 },
  (_, i) => ({ x: -12 + i * 10, z: -92 }),
);

export const CAPACITORS: readonly { x: number; z: number }[] = [
  { x: -46, z: -78 },
  { x: -46, z: -66 },
  { x: -46, z: -54 },
  { x: 72, z: 26 },
  { x: 86, z: 26 },
  { x: 100, z: 26 },
  { x: -88, z: -18 },
  { x: -88, z: -6 },
];

export const CAPACITOR_RADIUS = 3.2;
export const COIL_HALF = 3.5;

export function solid(x: number, z: number, margin = 0): boolean {
  for (const s of ZONES) {
    if (s.kind === 'block') continue;
    const fp = footprint(s);
    if (Math.abs(x - fp.x) < fp.w / 2 + margin && Math.abs(z - fp.z) < fp.d / 2 + margin) return true;
  }
  for (const b of COILS) {
    if (Math.abs(x - b.x) < COIL_HALF + margin && Math.abs(z - b.z) < COIL_HALF + margin) {
      return true;
    }
  }
  for (const c of CAPACITORS) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < (CAPACITOR_RADIUS + margin) ** 2) return true;
  }
  for (const b of INDUCTORS) {
    if (Math.abs(x - b.x) < 4 + margin && Math.abs(z - b.z) < 4 + margin) return true;
  }
  for (const d of DIODES) {
    if (Math.abs(x - d.x) < 4.5 + margin && Math.abs(z - d.z) < 4.5 + margin) return true;
  }
  return false;
}

export function dense(x: number, z: number): boolean {
  for (const s of ZONES) {
    if (s.kind !== 'block') continue;
    if (Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2) return true;
  }
  return false;
}

export const occupied = solid;

export const HEADERS: readonly { x: number; z: number; pins: number }[] = [
  { x: -84, z: 112, pins: 5 },
  { x: -58, z: 112, pins: 9 },
  { x: -20, z: 112, pins: 4 },
  { x: 2, z: 112, pins: 9 },
  { x: 40, z: 112, pins: 5 },
  { x: 62, z: 112, pins: 4 },
  { x: 96, z: 96, pins: 6 },
];

export const HEADER_PIN_PITCH = 2.54;

export const INDUCTORS: readonly { x: number; z: number }[] = [
  { x: 100, z: 74 }, { x: 100, z: 88 }, { x: 30, z: 58 },
  { x: -70, z: 84 }, { x: 30, z: 34 }, { x: -74, z: -20 },
  { x: -80, z: -70 }, { x: -80, z: -48 },
];

export const DIODES: readonly { x: number; z: number; rot: 0 | 1 }[] = [
  { x: 100, z: 58, rot: 1 }, { x: 22, z: 76, rot: 0 },
  { x: -62, z: 8, rot: 0 }, { x: 44, z: -6, rot: 1 },
  { x: -104, z: 46, rot: 1 }, { x: 66, z: 100, rot: 0 },
];

export const BATTERY = { x: -101, z: 90, r: 10 } as const;

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
