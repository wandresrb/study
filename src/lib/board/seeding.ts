import { rng, COILS, dense, solid, zone } from './layout';
import { inHole } from './holes';
import { reserveBuses } from './traces';

export const FOOTPRINTS = {
  p0402: { w: 1, d: 0.5, h: 0.35 },
  p0603: { w: 1.6, d: 0.8, h: 0.45 },
  p0805: { w: 2, d: 1.25, h: 0.6 },
  sot23: { w: 2.9, d: 1.3, h: 1.1 },
  dfn: { w: 5, d: 6, h: 1.5 },
  soic: { w: 5, d: 4, h: 1.2 },
  coil: { w: 7, d: 7, h: 3.4 },
} as const;

export type Footprint = keyof typeof FOOTPRINTS;

export interface Part {
  x: number;
  z: number;
  footprint: Footprint;
  rot: 0 | 1;
  t: number;
}

function row(x0: number, z0: number, dx: number, dz: number, n: number, footprint: Footprint, rot: 0 | 1): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + dx * i, z: z0 + dz * i, footprint, rot, t: 0 });
  return out;
}

function block(
  x0: number,
  z0: number,
  cols: number,
  rows: number,
  px: number,
  pz: number,
  footprint: Footprint,
  rot: 0 | 1,
): Part[] {
  const out: Part[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      out.push({ x: x0 + c * px, z: z0 + r * pz, footprint, rot, t: 0 });
    }
  }
  return out;
}

function island(cx: number, cz: number): Part[] {
  return [
    { x: cx, z: cz, footprint: 'soic', rot: 0, t: 0 },
    ...row(cx - 3.6, cz - 3.4, 1.8, 0, 5, 'p0402', 1),
    ...row(cx - 3.6, cz + 3.4, 1.8, 0, 5, 'p0402', 1),
    ...row(cx - 4.6, cz - 1.6, 0, 1.6, 3, 'p0603', 0),
  ];
}

function phase(cx: number, cz: number): Part[] {
  return [
    { x: cx - 2.6, z: cz + 8, footprint: 'dfn', rot: 0, t: 0 },
    { x: cx + 3, z: cz + 8, footprint: 'dfn', rot: 0, t: 0 },
    ...row(cx - 3.4, cz + 13.5, 1.7, 0, 4, 'p0603', 1),
  ];
}

function motifs(): Part[] {
  const p: Part[] = [];

  const cpu = zone('cpu');
  if (cpu) {
    const z0 = cpu.z + cpu.d / 2 + 5.3;
    const x0 = cpu.x - cpu.w / 2 - 3;
    p.push(...row(x0, z0, 1.8, 0, 25, 'p0402', 1));
    p.push(...row(x0, z0 + 2.6, 1.8, 0, 25, 'p0402', 1));
  }
  p.push(...row(45, -80, 0, 1.8, 24, 'p0402', 0));
  p.push(...row(47.6, -80, 0, 1.8, 24, 'p0402', 0));

  for (const b of COILS) p.push(...phase(b.x, b.z));

  p.push(...block(70, 10, 14, 3, 2.8, 2.2, 'p0603', 1));

  p.push(...row(-76, 34, 2.4, 0, 34, 'p0603', 1));

  p.push(...row(48, 88, 2.6, 0, 16, 'p0603', 1));
  p.push(...row(42, 44, 0, 2.6, 14, 'p0603', 0));

  const ISLANDS: [number, number][] = [
    [-70, -74],
    [-70, -58],
    [-70, -42],
    [30, 6],
    [46, 6],
    [30, 24],
    [-100, -2],
    [-100, 18],
    [-100, 38],
    [-100, 58],
    [-62, 96],
    [-38, 96],
    [-14, 96],
    [10, 96],
    [34, 96],
  ];
  for (const [x, z] of ISLANDS) p.push(...island(x, z));

  const BLOCKS: [number, number, number, number][] = [
    [50, -114, 12, 6],
    [-90, -80, 8, 5],
    [16, -6, 10, 5],
    [-88, 62, 8, 6],
    [-84, 104, 20, 3],
    [14, 104, 16, 3],
  ];
  for (const [x, z, cols, rows] of BLOCKS) {
    p.push(...block(x, z, cols, rows, 2.6, 2.2, 'p0402', 1));
  }

  p.push(...row(92, -112, 4.2, 0, 6, 'sot23', 1));
  p.push(...row(-108, -70, 0, 4.2, 7, 'sot23', 0));

  return p;
}

export function seed(): Part[] {
  const rnd = rng(0x51117a3);
  const onBus = reserveBuses(1.4);
  const out: Part[] = [];

  const hitsBus = (part: Part): boolean => {
    const f = FOOTPRINTS[part.footprint];
    const hx = (part.rot === 1 ? f.d : f.w) / 2 + 0.5;
    const hz = (part.rot === 1 ? f.w : f.d) / 2 + 0.5;
    for (const dx of [-hx, 0, hx]) {
      for (const dz of [-hz, 0, hz]) {
        if (onBus(part.x + dx, part.z + dz)) return true;
      }
    }
    return false;
  };

  for (const part of motifs()) {
    const { x, z } = part;
    if (Math.abs(x) > 116 || Math.abs(z) > 116) continue;
    if (solid(x, z, 1.6) || inHole(x, z, 1.4)) continue;
    if (hitsBus(part)) continue;
    out.push({ ...part, t: rnd() });
  }

  return out;
}

export function denseGaps(parts: readonly Part[]): number {
  let empty = 0;
  for (let x = -110; x <= 110; x += 10) {
    for (let z = -110; z <= 110; z += 10) {
      if (!dense(x, z) || solid(x, z, 4)) continue;
      const near = parts.some((p) => Math.abs(p.x - x) < 12 && Math.abs(p.z - z) < 12);
      if (!near) empty++;
    }
  }
  return empty;
}
