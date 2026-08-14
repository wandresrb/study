import {
  COILS,
  HEADERS,
  CAPACITORS,
  DIODES,
  INDUCTORS,
  HALF,
  HEADER_PIN_PITCH,
  COIL_HALF,
  BATTERY,
  CAPACITOR_RADIUS,
  HOLE_RADIUS,
  IDEAL_HOLES,
  ZONES,
  footprint,
} from './layout';
import { reserveBuses } from './traces';

export interface Hole {
  x: number;
  z: number;
  offset: number;
}

function hitsPart(x: number, z: number, r: number): boolean {
  for (const s of ZONES) {
    if (s.kind === 'block') continue;
    const fp = footprint(s);
    if (Math.abs(x - fp.x) < fp.w / 2 + r && Math.abs(z - fp.z) < fp.d / 2 + r) return true;
  }
  for (const c of HEADERS) {
    const width = c.pins * HEADER_PIN_PITCH;
    if (
      Math.abs(x - (c.x + width / 2 - HEADER_PIN_PITCH / 2)) < width / 2 + r &&
      Math.abs(z - c.z) < HEADER_PIN_PITCH + r
    ) {
      return true;
    }
  }
  for (const b of COILS) {
    if (Math.abs(x - b.x) < COIL_HALF + r && Math.abs(z - b.z) < COIL_HALF + r) return true;
  }
  for (const c of CAPACITORS) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < (CAPACITOR_RADIUS + r) ** 2) return true;
  }
  for (const b of INDUCTORS) {
    if (Math.abs(x - b.x) < 4 + r && Math.abs(z - b.z) < 4 + r) return true;
  }
  for (const d of DIODES) {
    if (Math.abs(x - d.x) < 4.5 + r && Math.abs(z - d.z) < 4.5 + r) return true;
  }
  if ((x - BATTERY.x) ** 2 + (z - BATTERY.z) ** 2 < (BATTERY.r + r) ** 2) return true;
  return false;
}

let cache: Hole[] | null = null;

export function holes(): Hole[] {
  if (cache) return cache;

  const onBus = reserveBuses(0);
  const hitsBus = (x: number, z: number, r: number) => {
    if (onBus(x, z)) return true;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      for (const k of [1, 0.7, 0.4]) {
        if (onBus(x + Math.cos(a) * r * k, z + Math.sin(a) * r * k)) return true;
      }
    }
    return false;
  };

  const free = (x: number, z: number) => {
    if (Math.abs(x) > HALF - HOLE_RADIUS - 2) return false;
    if (Math.abs(z) > HALF - HOLE_RADIUS - 2) return false;
    if (hitsPart(x, z, HOLE_RADIUS)) return false;
    if (hitsBus(x, z, HOLE_RADIUS)) return false;
    return true;
  };

  const out: Hole[] = [];
  for (const ideal of IDEAL_HOLES) {
    let placed: Hole | null = null;

    for (let r = 0; r <= 14 && !placed; r += 2) {
      const steps = r === 0 ? 1 : Math.max(8, Math.round((r * Math.PI * 2) / 2));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = ideal.x + Math.cos(a) * r;
        const z = ideal.z + Math.sin(a) * r;
        if (!free(x, z)) continue;
        if (out.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < (HOLE_RADIUS * 2.4) ** 2)) continue;
        placed = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, offset: r };
        break;
      }
    }

    if (placed) out.push(placed);
  }

  cache = out;
  return out;
}

export function inHole(x: number, z: number, margin = 0): boolean {
  for (const t of holes()) {
    if ((x - t.x) ** 2 + (z - t.z) ** 2 < (HOLE_RADIUS + margin) ** 2) return true;
  }
  return false;
}
