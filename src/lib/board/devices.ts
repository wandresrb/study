import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  SphereGeometry,
} from 'three/webgpu';
import { color, smoothstep, uniform, uv } from 'three/tsl';

import { HEADERS, ZONES } from './layout';
import type { Materials } from './parts';

type Point = readonly [number, number];

const NEON = 0x7fd6ff;
const TUBE = 3.4;

const MONITOR = {
  z: -330,
  base: { w: 210, h: 12, d: 140, z: 26 },
  neck: { w: 40, h: 190, d: 30, z: 18 },
  panel: { w: 530, h: 310, d: 18, tilt: -0.14 },
  overlap: 10,
};
const PANEL_Y = MONITOR.base.h + MONITOR.neck.h - MONITOR.overlap;

const KEYBOARD = { x: -24, z: 300, w: 430, h: 18, d: 150 };
const MOUSE = { x: 262, z: 296, w: 62, h: 30, d: 105 };

const NEON_Y = 0.14;

interface Ribbon {
  pos: number[];
  uvs: number[];
  idx: number[];
  v: number;
}

function ribbon(c: Ribbon, path: Point[], u0: number, u1: number, width: number) {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    lengths.push(d);
    total += d;
  }
  if (total <= 0) return;

  let traveled = 0;
  const h = width / 2;

  for (let i = 1; i < path.length; i++) {
    const [x0, z0] = path[i - 1];
    const [x1, z1] = path[i];
    const len = lengths[i - 1] || 1;

    const ua = u0 + ((u1 - u0) * traveled) / total;
    traveled += len;
    const ub = u0 + ((u1 - u0) * traveled) / total;

    const dx = (x1 - x0) / len;
    const dz = (z1 - z0) / len;
    const ex = dx * h;
    const ez = dz * h;
    const nx = -dz * h;
    const nz = dx * h;

    const ax = x0 - ex;
    const az = z0 - ez;
    const bx = x1 + ex;
    const bz = z1 + ez;

    c.pos.push(ax - nx, NEON_Y, az - nz, ax + nx, NEON_Y, az + nz, bx + nx, NEON_Y, bz + nz, bx - nx, NEON_Y, bz - nz);
    c.uvs.push(ua, 0, ua, 1, ub, 1, ub, 0);
    c.idx.push(c.v, c.v + 1, c.v + 2, c.v, c.v + 2, c.v + 3);
    c.v += 4;
  }
}

function cables(): { path: Point[]; delay: number }[] {
  const io = ZONES.find((z) => z.id === 'io');
  const video: Point = io ? [io.x + 18, io.z - io.d / 2] : [-60, -120];
  const front = (i: number): Point => {
    const c = HEADERS[i];
    return c ? [c.x, c.z + 4] : [0, 116];
  };

  return [
    { delay: 0, path: [video, [video[0], -212], [0, -212], [0, MONITOR.base.z]] },
    { delay: 0.08, path: [front(2), [front(2)[0], 232], [KEYBOARD.x, 232], [KEYBOARD.x, KEYBOARD.z - KEYBOARD.d / 2]] },
    { delay: 0.15, path: [front(4), [front(4)[0], 232], [MOUSE.x, 232], [MOUSE.x, MOUSE.z - MOUSE.d / 2]] },
  ];
}

export interface Devices {
  group: Group;
  apply(p: number): void;
  dispose(): void;
}

export function devices(m: Materials): Devices {
  const group = new Group();
  const geos: BufferGeometry[] = [];

  const nest = (x: number, z: number) => {
    const g = new Group();
    g.position.set(x, 0, z);
    group.add(g);
    return g;
  };

  const box = (
    parent: Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: MeshStandardNodeMaterial,
  ) => {
    const g = new BoxGeometry(w, h, d);
    geos.push(g);
    const mesh = new Mesh(g, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const gMonitor = nest(0, MONITOR.z);
  box(gMonitor, MONITOR.base.w, MONITOR.base.h, MONITOR.base.d, 0, 0, MONITOR.base.z, m.body);
  box(gMonitor, MONITOR.neck.w, MONITOR.neck.h, MONITOR.neck.d, 0, MONITOR.base.h, MONITOR.neck.z, m.body);

  const panel = box(gMonitor, MONITOR.panel.w, MONITOR.panel.h, MONITOR.panel.d, 0, PANEL_Y, 0, m.body);
  panel.rotation.x = MONITOR.panel.tilt;

  const screenMat = new MeshStandardNodeMaterial({
    color: 0x0a1622,
    metalness: 0.1,
    roughness: 0.28,
  });
  const screenGeo = new BoxGeometry(MONITOR.panel.w - 26, MONITOR.panel.h - 26, 2);
  geos.push(screenGeo);
  const screen = new Mesh(screenGeo, screenMat);
  screen.position.set(0, PANEL_Y + MONITOR.panel.h / 2, MONITOR.panel.d / 2 + 1);
  screen.rotation.x = MONITOR.panel.tilt;
  gMonitor.add(screen);

  const gKeyboard = nest(KEYBOARD.x, KEYBOARD.z);
  box(gKeyboard, KEYBOARD.w, KEYBOARD.h, KEYBOARD.d, 0, 0, 0, m.body);

  const COLS = 21;
  const ROWS = 5;
  const STEP_X = 19;
  const STEP_Z = 19;
  const keyGeo = new BoxGeometry(15, 5, 15);
  geos.push(keyGeo);
  const keys = new InstancedMesh(keyGeo, m.plastic, COLS * ROWS);
  keys.castShadow = true;
  keys.receiveShadow = true;
  const mat4 = new Matrix4();
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      mat4.makeTranslation((c - (COLS - 1) / 2) * STEP_X, KEYBOARD.h + 2.5, (r - (ROWS - 1) / 2) * STEP_Z);
      keys.setMatrixAt(n++, mat4);
    }
  }
  keys.instanceMatrix.needsUpdate = true;
  gKeyboard.add(keys);

  const gMouse = nest(MOUSE.x, MOUSE.z);
  const mouseGeo = new SphereGeometry(0.5, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  mouseGeo.scale(MOUSE.w, MOUSE.h * 2, MOUSE.d);
  geos.push(mouseGeo);
  const mouse = new Mesh(mouseGeo, m.body);
  mouse.castShadow = true;
  mouse.receiveShadow = true;
  gMouse.add(mouse);

  const slotGeo = new BoxGeometry(1.6, 3, MOUSE.d * 0.42);
  geos.push(slotGeo);
  const slot = new Mesh(slotGeo, m.channel);
  slot.position.set(0, MOUSE.h - 1, -MOUSE.d * 0.22);
  gMouse.add(slot);

  const rib: Ribbon = { pos: [], uvs: [], idx: [], v: 0 };
  for (const cable of cables()) ribbon(rib, cable.path, cable.delay, cable.delay + 0.85, TUBE);

  const neonGeo = new BufferGeometry();
  neonGeo.setAttribute('position', new Float32BufferAttribute(rib.pos, 3));
  neonGeo.setAttribute('uv', new Float32BufferAttribute(rib.uvs, 2));
  neonGeo.setIndex(rib.idx);

  const front = uniform(0);
  const level = uniform(0);

  const co = uv();
  const tube = co.y.sub(0.5).abs().mul(2).oneMinus().pow(2.6);
  const live = smoothstep(front.sub(0.07), front, co.x).oneMinus();
  const i = tube.mul(live).mul(level);

  const neonMat = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  neonMat.colorNode = color(NEON).mul(i);
  neonMat.opacityNode = i;

  const neonMesh = new Mesh(neonGeo, neonMat);
  neonMesh.frustumCulled = false;
  group.add(neonMesh);

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const band = (p: number, a: number, b: number) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

  const nests: { g: Group; delay: number }[] = [
    { g: gMonitor, delay: 0 },
    { g: gKeyboard, delay: 0.05 },
    { g: gMouse, delay: 0.09 },
  ];
  for (const nn of nests) nn.g.scale.set(1, 0.0001, 1);
  group.visible = false;

  return {
    group,

    apply(p) {
      const reveal = band(p, 0.56, 0.68);
      group.visible = reveal > 0.001;

      for (const nn of nests) {
        const e = band(p, 0.56 + nn.delay, 0.68 + nn.delay);
        nn.g.scale.y = Math.max(0.0001, e);
      }

      level.value = reveal;
      front.value = band(p, 0.59, 0.74) * 1.15;
    },

    dispose() {
      for (const g of geos) g.dispose();
      neonGeo.dispose();
      neonMat.dispose();
      screenMat.dispose();
      keys.dispose();
    },
  };
}
