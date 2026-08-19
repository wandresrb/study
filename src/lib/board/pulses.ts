import {
  AdditiveBlending,
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  Mesh,
  MeshBasicNodeMaterial,
  NearestFilter,
  RGBAFormat,
} from 'three/webgpu';
import { color, texture, uv } from 'three/tsl';

import { inHole } from './holes';
import { rng } from './layout';
import { buses, type Point } from './traces';

const LIFT = 0.09;
const WIDTH = 0.45;
const TINT = 0xa9b6ff;

interface Cycle {
  next: number;
  since: number;
  rise: number;
  hold: number;
  fall: number;
  peak: number;
}

export interface Pulses {
  mesh: Mesh;
  update(t: number, intensity: number): void;
  dispose(): void;
}

export function pulses(): Pulses {
  const rnd = rng(0x7e11a5);

  const traces: Point[][] = [];
  for (const h of buses()) traces.push(...h.traces);

  const pos: number[] = [];
  const ids: number[] = [];
  const idx: number[] = [];
  let v = 0;

  traces.forEach((p, id) => {
    for (let i = 1; i < p.length; i++) {
      const [x0, z0] = p[i - 1];
      const [x1, z1] = p[i];
      if (
        inHole(x0, z0, 0.6) ||
        inHole(x1, z1, 0.6) ||
        inHole((x0 + x1) / 2, (z0 + z1) / 2, 0.6) ||
        inHole((x0 * 3 + x1) / 4, (z0 * 3 + z1) / 4, 0.6) ||
        inHole((x0 + x1 * 3) / 4, (z0 + z1 * 3) / 4, 0.6)
      ) {
        continue;
      }
      let dx = x1 - x0;
      let dz = z1 - z0;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;

      const ex = dx * (WIDTH / 2);
      const ez = dz * (WIDTH / 2);
      const nx = -dz * (WIDTH / 2);
      const nz = dx * (WIDTH / 2);

      const ax = x0 - ex;
      const az = z0 - ez;
      const bx = x1 + ex;
      const bz = z1 + ez;

      pos.push(ax - nx, LIFT, az - nz, ax + nx, LIFT, az + nz, bx + nx, LIFT, bz + nz, bx - nx, LIFT, bz - nz);
      const u = (id + 0.5) / traces.length;
      ids.push(u, 0.5, u, 0.5, u, 0.5, u, 0.5);
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
  });

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(ids, 2));
  geo.setIndex(idx);

  const data = new Uint8Array(traces.length * 4);
  const table = new DataTexture(data, traces.length, 1, RGBAFormat);
  table.magFilter = NearestFilter;
  table.minFilter = NearestFilter;
  table.generateMipmaps = false;
  table.needsUpdate = true;

  const material = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const glow = texture(table, uv()).r;
  material.colorNode = color(TINT).mul(glow);
  material.opacityNode = glow;

  const mesh = new Mesh(geo, material);
  mesh.frustumCulled = false;

  const cycles: Cycle[] = traces.map(() => ({
    next: rnd() * 9,
    since: -99,
    rise: 0.05 + rnd() * 0.09,
    hold: 0.1 + rnd() * 0.24,
    fall: 0.5 + rnd() * 0.9,
    peak: 0.34 + rnd() * 0.3,
  }));

  return {
    mesh,

    update(t, intensity) {
      for (let i = 0; i < cycles.length; i++) {
        const c = cycles[i];
        if (t >= c.next) {
          c.since = t;
          c.next = t + (rnd() < 0.25 ? 0.2 + rnd() * 0.5 : 2.5 + rnd() * 9);
        }

        const d = t - c.since;
        let a = 0;
        if (d >= 0) {
          if (d < c.rise) a = d / c.rise;
          else if (d < c.rise + c.hold) a = 1;
          else {
            const f = (d - c.rise - c.hold) / c.fall;
            a = f < 1 ? 1 - f * f : 0;
          }
        }

        const val = Math.round(Math.min(1, a * c.peak * intensity) * 255);
        data[i * 4] = val;
        data[i * 4 + 1] = val;
        data[i * 4 + 2] = val;
        data[i * 4 + 3] = 255;
      }
      table.needsUpdate = true;
    },

    dispose() {
      geo.dispose();
      material.dispose();
      table.dispose();
    },
  };
}
