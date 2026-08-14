import { rng, solid, ZONES } from './layout';

export type Point = readonly [number, number];

export interface Bundle {
  traces: Point[][];
  axis: Point[];
  width: number;
}

function bevel(path: Point[], cut: number): Point[] {
  if (path.length < 3) return path;
  const out: Point[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const [px, pz] = path[i - 1];
    const [cx, cz] = path[i];
    const [nx, nz] = path[i + 1];

    const d1 = Math.hypot(cx - px, cz - pz);
    const d2 = Math.hypot(nx - cx, nz - cz);
    const c = Math.min(cut, d1 * 0.45, d2 * 0.45);
    if (c < 0.05) {
      out.push(path[i]);
      continue;
    }
    out.push([cx - ((cx - px) / d1) * c, cz - ((cz - pz) / d1) * c]);
    out.push([cx + ((nx - cx) / d2) * c, cz + ((nz - cz) / d2) * c]);
  }
  out.push(path[path.length - 1]);
  return out;
}

interface Request {
  from: Point;
  to: Point;
  n: number;
  pitch: number;
  width: number;
  horizontal: boolean;
}

function bundle(p: Request): Bundle {
  const [ax, az] = p.from;
  const [bx, bz] = p.to;
  const center = (p.n - 1) / 2;
  const traces: Point[][] = [];

  for (let i = 0; i < p.n; i++) {
    const o = (i - center) * p.pitch;
    const raw: Point[] = p.horizontal
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
    traces.push(bevel(raw, 3.2));
  }

  return { traces, axis: traces[center | 0], width: p.width };
}

function edge(
  id: string,
  side: 'n' | 's' | 'e' | 'w',
  t = 0,
  inset = 0,
  fallback?: Point,
): Point {
  const z = ZONES.find((s) => s.id === id);
  if (!z) {
    if (fallback) return fallback;
    throw new Error(`unknown zone without fallback: ${id}`);
  }
  switch (side) {
    case 'n':
      return [z.x + t, z.z - z.d / 2 + inset];
    case 's':
      return [z.x + t, z.z + z.d / 2 - inset];
    case 'w':
      return [z.x - z.w / 2 + inset, z.z + t];
    default:
      return [z.x + z.w / 2 - inset, z.z + t];
  }
}

const CPU_INSET = 2;

export function buses(): Bundle[] {
  return [
    bundle({ from: edge('cpu', 'e', -12, CPU_INSET), to: edge('dimm-a', 'w', -24), n: 16, pitch: 0.85, width: 0.3, horizontal: true }),
    bundle({ from: edge('cpu', 'e', 12, CPU_INSET), to: edge('dimm-a', 'w', 26), n: 16, pitch: 0.85, width: 0.3, horizontal: true }),

    bundle({ from: edge('cpu', 's', -6, CPU_INSET), to: edge('pcie16', 'n', 32), n: 14, pitch: 0.85, width: 0.3, horizontal: false }),

    bundle({ from: edge('cpu', 'w', -14, CPU_INSET), to: edge('io', 'e', 6), n: 10, pitch: 0.9, width: 0.3, horizontal: true }),

    bundle({ from: edge('chipset', 'w', -4), to: edge('m2-bot', 'e', 0), n: 10, pitch: 0.85, width: 0.3, horizontal: true }),
    bundle({ from: edge('chipset', 'w', 8), to: edge('pcie1', 'e', 0), n: 8, pitch: 0.85, width: 0.3, horizontal: true }),
    bundle({ from: edge('chipset', 's', -8), to: [40, 108], n: 12, pitch: 0.8, width: 0.28, horizontal: false }),
    bundle({ from: edge('chipset', 'n', 0), to: edge('m2-top', 'e', 4), n: 8, pitch: 0.9, width: 0.3, horizontal: true }),

    bundle({ from: edge('atx', 'n', -9), to: edge('vrm-n', 'e', 2), n: 3, pitch: 2.2, width: 1.4, horizontal: false }),
    bundle({ from: edge('vrm-n', 's', -8), to: edge('cpu', 'n', 4, CPU_INSET), n: 4, pitch: 2.4, width: 1.4, horizontal: false }),
  ];
}

export interface Fanout {
  traces: Point[][];
  vias: Point[];
}

export function cpuFanout(): Fanout {
  const z = ZONES.find((s) => s.id === 'cpu');
  if (!z) return { traces: [], vias: [] };

  const rnd = rng(0x0cfa11);
  const traces: Point[][] = [];
  const vias: Point[] = [];
  const PITCH = 1.1;
  const INSET = 1.6;

  const sides: { fixed: number; axis: 'x' | 'z'; n: -1 | 1 }[] = [
    { fixed: z.z - z.d / 2, axis: 'x', n: -1 },
    { fixed: z.z + z.d / 2, axis: 'x', n: 1 },
    { fixed: z.x - z.w / 2, axis: 'z', n: -1 },
    { fixed: z.x + z.w / 2, axis: 'z', n: 1 },
  ];

  for (const side of sides) {
    const length = side.axis === 'x' ? z.w : z.d;
    const center = side.axis === 'x' ? z.x : z.z;
    const n = Math.floor((length - 3) / PITCH);

    for (let i = 0; i <= n; i++) {
      const t = center + (i - n / 2) * PITCH;
      const reach = 2.2 + (i % 3) * 1.3 + rnd() * 0.5;

      const a: Point =
        side.axis === 'x'
          ? [t, side.fixed - side.n * INSET]
          : [side.fixed - side.n * INSET, t];
      const b: Point =
        side.axis === 'x' ? [t, side.fixed + side.n * reach] : [side.fixed + side.n * reach, t];

      if (solid(b[0], b[1], 0.6)) continue;
      traces.push([a, b]);
      vias.push(b);
    }
  }

  return { traces, vias };
}

export function reserveBuses(margin: number): (x: number, z: number) => boolean {
  const SIDE = 244;
  const HALF = SIDE / 2;
  const grid = new Uint8Array(SIDE * SIDE);

  const mark = (x: number, z: number, r: number) => {
    const cx = Math.round(x + HALF);
    const cz = Math.round(z + HALF);
    const ri = Math.ceil(r);
    for (let dz = -ri; dz <= ri; dz++) {
      for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dz * dz > r * r) continue;
        const gx = cx + dx;
        const gz = cz + dz;
        if (gx < 0 || gx >= SIDE || gz < 0 || gz >= SIDE) continue;
        grid[gz * SIDE + gx] = 1;
      }
    }
  };

  for (const h of buses()) {
    const r = h.width / 2 + margin;
    for (const trace of h.traces) {
      for (let i = 1; i < trace.length; i++) {
        const [x0, z0] = trace[i - 1];
        const [x1, z1] = trace[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const steps = Math.max(1, Math.ceil(len * 2));
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          mark(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, r);
        }
      }
    }
  }

  return (x, z) => {
    const gx = Math.round(x + HALF);
    const gz = Math.round(z + HALF);
    if (gx < 0 || gx >= SIDE || gz < 0 || gz >= SIDE) return false;
    return grid[gz * SIDE + gx] === 1;
  };
}
