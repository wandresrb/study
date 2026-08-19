import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three/webgpu';

import { rng, HEADERS, solid, SIDE, HALF, HEADER_PIN_PITCH, BATTERY, ZONES } from './layout';
import { inHole, holes } from './holes';
import { FOOTPRINTS, type Part } from './seeding';
import { cpuFanout, buses, type Point } from './traces';

const N = 2048;
const PX = N / SIDE;

const COLOR = {
  mask: '#262838',
  plane: '#2f3146',
  trace: '#585d7d',
  power: '#6b7296',
  metal: '#e2e7f7',
  via: '#1b1c28',
  ink: '#eef1fa',
  bare: '#3c3a44',
  solder: '#c9cee2',
  inkFaint: '#6f748c',
};

const SURF = {
  mask: 'rgb(10,216,0)',
  trace: 'rgb(12,158,0)',
  metal: 'rgb(242,58,0)',
  ink: 'rgb(0,246,0)',
};

const ax = (x: number) => (x + HALF) * PX;
const az = (z: number) => (z + HALF) * PX;

function drawPath(c: CanvasRenderingContext2D, p: Point[]) {
  c.beginPath();
  c.moveTo(ax(p[0][0]), az(p[0][1]));
  for (let i = 1; i < p.length; i++) c.lineTo(ax(p[i][0]), az(p[i][1]));
  c.stroke();
}

function layer(
  ctxs: [CanvasRenderingContext2D, CanvasRenderingContext2D],
  colors: [string, string],
  fn: (c: CanvasRenderingContext2D) => void,
) {
  for (let i = 0; i < 2; i++) {
    const c = ctxs[i];
    c.save();
    c.fillStyle = colors[i];
    c.strokeStyle = colors[i];
    fn(c);
    c.restore();
  }
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = N;
  cv.height = N;
  const c = cv.getContext('2d')!;
  return [cv, c];
}

export interface Mask {
  color: CanvasTexture;
  surface: CanvasTexture;
  dispose(): void;
}

export function mask(anisotropy: number, parts: readonly Part[]): Mask {
  const [cvColor, ctxColor] = makeCanvas();
  const [cvSurf, ctxSurf] = makeCanvas();
  const ctxs: [CanvasRenderingContext2D, CanvasRenderingContext2D] = [ctxColor, ctxSurf];
  const rnd = rng(0x0b0a4d17);

  layer(ctxs, [COLOR.mask, SURF.mask], (c) => c.fillRect(0, 0, N, N));

  layer(ctxs, [COLOR.plane, SURF.mask], (c) => {
    for (let i = 0; i < 14; i++) {
      const x = (rnd() - 0.5) * SIDE;
      const z = (rnd() - 0.5) * SIDE;
      const w = (18 + rnd() * 70) * PX;
      const h = (18 + rnd() * 70) * PX;
      c.globalAlpha = 0.5 + rnd() * 0.5;
      c.fillRect(ax(x) - w / 2, az(z) - h / 2, w, h);
    }
    c.globalAlpha = 0.35;
    c.lineWidth = 1;
    for (let i = 0; i < N; i += 7) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, N);
      c.moveTo(0, i);
      c.lineTo(N, i);
      c.stroke();
    }
  });

  const bundles = buses();
  for (const h of bundles) {
    const power = h.width > 1;
    layer(ctxs, [power ? COLOR.power : COLOR.trace, SURF.trace], (c) => {
      c.lineWidth = Math.max(1.4, h.width * PX);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (const p of h.traces) drawPath(c, p);
    });
  }

  const vias: [number, number][] = [];
  layer(ctxs, [COLOR.trace, SURF.trace], (c) => {
    c.lineWidth = Math.max(1.2, 0.28 * PX);
    c.lineCap = 'round';
    for (const part of parts) {
      const f = FOOTPRINTS[part.footprint];
      const ex = part.rot === 1 ? 0 : 1;
      const ez = part.rot === 1 ? 1 : 0;
      for (const side of [-1, 1]) {
        const px = part.x + ex * side * (f.w / 2);
        const pz = part.z + ez * side * (f.w / 2);
        const len = 1.6 + part.t * 4;
        const qx = px + ex * side * len;
        const qz = pz + ez * side * len;
        if (solid(qx, qz, 0)) continue;
        drawPath(c, [
          [px, pz],
          [qx, qz],
        ]);
        vias.push([qx, qz]);
      }
    }
  });

  const fanout = cpuFanout();
  layer(ctxs, [COLOR.trace, SURF.trace], (c) => {
    c.lineWidth = Math.max(1.2, 0.26 * PX);
    c.lineCap = 'round';
    for (let i = 0; i < fanout.traces.length; i++) {
      const v = fanout.vias[i];
      if (inHole(v[0], v[1], 0.8)) continue;
      drawPath(c, fanout.traces[i]);
      vias.push([v[0], v[1]]);
    }
  });

  layer(ctxs, [COLOR.via, SURF.mask], (c) => {
    for (const [x, z] of vias) {
      c.beginPath();
      c.arc(ax(x), az(z), 0.42 * PX, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 220; i++) {
      const x = (rnd() - 0.5) * SIDE * 0.97;
      const z = (rnd() - 0.5) * SIDE * 0.97;
      if (solid(x, z, 0) || inHole(x, z, 0)) continue;
      c.beginPath();
      c.arc(ax(x), az(z), 0.38 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });

  layer(ctxs, [COLOR.metal, SURF.metal], (c) => {
    for (const s of ZONES) {
      if (s.kind !== 'slot') continue;
      const lengthwise = s.d > s.w;
      const n = lengthwise ? Math.round(s.d / 1.3) : Math.round(s.w / 1.3);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * (lengthwise ? s.d : s.w) * 0.94;
        const px = ax(lengthwise ? s.x : s.x + t);
        const pz = az(lengthwise ? s.z + t : s.z);
        c.fillRect(px - 0.3 * PX, pz - 0.3 * PX, 0.6 * PX, 0.6 * PX);
      }
    }
    for (const part of parts) {
      const f = FOOTPRINTS[part.footprint];
      const ex = part.rot === 1 ? 0 : 1;
      const ez = part.rot === 1 ? 1 : 0;
      const padW = f.w * 0.32;
      const padL = f.d * 1.15;
      for (const side of [-1, 1]) {
        const px = part.x + ex * side * (f.w / 2 - padW / 2);
        const pz = part.z + ez * side * (f.w / 2 - padW / 2);
        const w = (ex ? padW : padL) * PX;
        const h = (ex ? padL : padW) * PX;
        c.fillRect(ax(px) - w / 2, az(pz) - h / 2, w, h);
      }
    }
  });

  layer(ctxs, [COLOR.solder, SURF.metal], (c) => {
    const ring = (x: number, z: number, r: number, square: boolean) => {
      if (square) c.fillRect(ax(x) - r * PX, az(z) - r * PX, r * 2 * PX, r * 2 * PX);
      else {
        c.beginPath();
        c.arc(ax(x), az(z), r * PX, 0, Math.PI * 2);
        c.fill();
      }
    };
    for (const hdr of HEADERS) {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < hdr.pins; i++) {
          ring(hdr.x + i * HEADER_PIN_PITCH, hdr.z + (row - 0.5) * HEADER_PIN_PITCH, 0.85, i === 0 && row === 0);
        }
      }
    }
    for (const z of ZONES) {
      if (z.kind !== 'slot') continue;
      const lengthwise = z.d > z.w;
      const len = lengthwise ? z.d : z.w;
      for (const side of [-1, 1]) {
        const t = side * (len / 2 - 3);
        ring(z.x + (lengthwise ? 0 : t), z.z + (lengthwise ? t : 0), 1.1, false);
      }
    }
  });
  layer(ctxs, ['#0a0a10', SURF.mask], (c) => {
    for (const hdr of HEADERS) {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < hdr.pins; i++) {
          c.beginPath();
          c.arc(ax(hdr.x + i * HEADER_PIN_PITCH), az(hdr.z + (row - 0.5) * HEADER_PIN_PITCH), 0.4 * PX, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  });

  layer(ctxs, [COLOR.ink, SURF.ink], (c) => {
    c.lineWidth = Math.max(1, 0.22 * PX);

    for (const s of ZONES) {
      if (s.kind === 'block') continue;
      const w = s.w * PX;
      const h = s.d * PX;
      c.globalAlpha = 0.55;
      c.strokeRect(ax(s.x) - w / 2 - 2, az(s.z) - h / 2 - 2, w + 4, h + 4);
      c.globalAlpha = 0.75;
      c.beginPath();
      c.arc(ax(s.x) - w / 2 - 5, az(s.z) - h / 2 - 5, 1.1 * PX, 0, Math.PI * 2);
      c.fill();
    }

    c.globalAlpha = 0.85;
    c.font = `${Math.round(2.6 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.textBaseline = 'middle';
    for (const s of ZONES) {
      if (!s.label) continue;
      c.fillText(s.label, ax(s.x) - (s.w * PX) / 2, az(s.z) - (s.d * PX) / 2 - 4.4 * PX);
    }

    c.globalAlpha = 0.5;
    c.font = `${Math.round(1.9 * PX)}px ui-monospace, monospace`;
    const letters = ['R', 'C', 'U', 'L', 'Q', 'D'];
    for (let i = 0; i < 240; i++) {
      const x = (rnd() - 0.5) * SIDE * 0.94;
      const z = (rnd() - 0.5) * SIDE * 0.94;
      if (solid(x, z, 3)) continue;
      c.fillText(`${letters[(rnd() * letters.length) | 0]}${(rnd() * 90 + 10) | 0}`, ax(x), az(z));
    }

    c.globalAlpha = 0.9;
    c.font = `600 ${Math.round(5.4 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.fillText('WANDRES.DEV  CS-244M', ax(-70), az(77));
    c.globalAlpha = 0.55;
    c.font = `${Math.round(2.8 * PX)}px ui-monospace, monospace`;
    c.fillText('REV 1.0', ax(-70), az(84));
    c.font = `${Math.round(2.6 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.fillText('BATTERY', ax(BATTERY.x - 6), az(BATTERY.z + BATTERY.r + 4));
  });

  layer(ctxs, [COLOR.bare, SURF.mask], (c) => {
    for (const t of holes()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 3.5 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });
  layer(ctxs, [COLOR.metal, SURF.metal], (c) => {
    for (const t of holes()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 2.05 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });
  layer(ctxs, ['#05050a', SURF.mask], (c) => {
    for (const t of holes()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 1.15 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });
  layer(ctxs, [COLOR.ink, SURF.ink], (c) => {
    c.globalAlpha = 0.4;
    c.lineWidth = Math.max(1, 0.22 * PX);
    for (const t of holes()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 4.1 * PX, 0, Math.PI * 2);
      c.stroke();
    }
  });

  const color = new CanvasTexture(cvColor);
  color.colorSpace = SRGBColorSpace;
  const surface = new CanvasTexture(cvSurf);

  for (const t of [color, surface]) {
    t.anisotropy = anisotropy;
    t.minFilter = LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
  }

  return {
    color,
    surface,
    dispose() {
      color.dispose();
      surface.dispose();
      cvColor.width = cvColor.height = 0;
      cvSurf.width = cvSurf.height = 0;
    },
  };
}
