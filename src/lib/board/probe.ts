import {
  AdditiveBlending,
  BufferGeometry,
  CylinderGeometry,
  DataTexture,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  TorusGeometry,
} from 'three/webgpu';
import { color, texture, uniform, uv, vec2 } from 'three/tsl';

import { BITS, RATE, SPAN, TIP } from '../probe-signal';
import { buses, type Point } from './traces';
import type { Materials } from './parts';

const LIFT = 0.12;
const WIDTH = 0.5;
const COPPER = 0x585d7d;
const SIGNAL = 0xffb37a;

/** Cumulative length along a polyline, and the total. */
function arc(path: readonly Point[]): { at: number[]; total: number } {
  const at = [0];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    at.push(total);
  }
  return { at, total };
}

/** The point at a fraction of the way along a polyline. */
function along(path: readonly Point[], u: number): Point {
  const { at, total } = arc(path);
  const want = u * total;
  for (let i = 1; i < path.length; i++) {
    if (at[i] < want) continue;
    const k = (want - at[i - 1]) / (at[i] - at[i - 1] || 1);
    return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k];
  }
  return path[path.length - 1];
}

/** One flat ribbon along a polyline, with u running 0→1 over its length. */
function ribbon(path: readonly Point[]): BufferGeometry {
  const { at, total } = arc(path);
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  let v = 0;

  for (let i = 1; i < path.length; i++) {
    const [x0, z0] = path[i - 1];
    const [x1, z1] = path[i];
    let dx = x1 - x0;
    let dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const nx = (-dz * WIDTH) / 2;
    const nz = (dx * WIDTH) / 2;

    pos.push(x0 - nx, LIFT, z0 - nz, x0 + nx, LIFT, z0 + nz, x1 + nx, LIFT, z1 + nz, x1 - nx, LIFT, z1 - nz);
    const u0 = at[i - 1] / total;
    const u1 = at[i] / total;
    uvs.push(u0, 0, u0, 1, u1, 1, u1, 0);
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

export interface Probe {
  group: Group;
  /** Where the needle touches the copper, in board coordinates. */
  tip: Point;
  set(t: number, lit: number): void;
  dispose(): void;
}

/**
 * The bus the story follows: the lanes that leave the processor for the memory
 * slots, as real copper instead of baked texture, so a close-up holds up. The
 * middle lane carries the byte, sampled straight off BITS.
 */
export function probe(m: Materials): Probe {
  const bus = buses()[0];
  const lane = bus.axis;

  const group = new Group();
  const geos: BufferGeometry[] = [];

  const copperMat = new MeshStandardNodeMaterial({ color: COPPER, metalness: 0.72, roughness: 0.38 });
  for (const path of bus.traces) {
    const geo = ribbon(path);
    geos.push(geo);
    const mesh = new Mesh(geo, copperMat);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const uTime = uniform(0);
  const uLit = uniform(0);

  const data = new Uint8Array(BITS.length * 4);
  BITS.forEach((b, i) => {
    data[i * 4] = b ? 255 : 0;
    data[i * 4 + 3] = 255;
  });
  const bits = new DataTexture(data, BITS.length, 1, RGBAFormat);
  bits.magFilter = NearestFilter;
  bits.minFilter = NearestFilter;
  bits.wrapS = RepeatWrapping;
  bits.generateMipmaps = false;
  bits.needsUpdate = true;

  const signalGeo = ribbon(lane);
  geos.push(signalGeo);
  const signalMat = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  // The pattern travels: what a lane looks like while a byte crosses it.
  const level = texture(bits, vec2(uv().x.sub(uTime.mul(RATE).div(SPAN)), 0.5)).r;
  const glow = level.mul(uLit);
  signalMat.colorNode = color(SIGNAL).mul(glow);
  signalMat.opacityNode = glow;
  const signal = new Mesh(signalGeo, signalMat);
  signal.frustumCulled = false;
  group.add(signal);

  // The needle: a tip on the copper, its shaft leaning out of the board.
  const tip = along(lane, TIP);
  const needle = new Group();
  needle.position.set(tip[0], 0, tip[1]);
  needle.visible = false;
  group.add(needle);

  // A ring on the copper marks the contact; the tip, shaft and grip lean away
  // from it on one axis, so the whole probe reads as one object touching down.
  const ringGeo = new TorusGeometry(0.8, 0.12, 8, 28);
  geos.push(ringGeo);
  const ring = new Mesh(ringGeo, m.steel);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = LIFT + 0.05;
  needle.add(ring);

  const arm = new Group();
  arm.rotation.z = -0.38;
  needle.add(arm);

  const tipGeo = new CylinderGeometry(0.5, 0.05, 3.4, 12);
  geos.push(tipGeo);
  const point = new Mesh(tipGeo, m.steel);
  point.position.y = LIFT + 1.7;
  point.castShadow = true;
  arm.add(point);

  const shaftGeo = new CylinderGeometry(0.62, 0.5, 9, 14);
  geos.push(shaftGeo);
  const shaft = new Mesh(shaftGeo, m.contact);
  shaft.position.y = LIFT + 7.9;
  shaft.castShadow = true;
  arm.add(shaft);

  const gripGeo = new CylinderGeometry(1.35, 1.15, 16, 16);
  geos.push(gripGeo);
  const grip = new Mesh(gripGeo, m.plastic);
  grip.position.y = LIFT + 20.4;
  grip.castShadow = true;
  arm.add(grip);

  const collarGeo = new CylinderGeometry(1.45, 1.45, 1.2, 16);
  geos.push(collarGeo);
  const collar = new Mesh(collarGeo, m.accent);
  collar.position.y = LIFT + 13.2;
  arm.add(collar);

  return {
    group,
    tip,

    set(t, lit) {
      uTime.value = t;
      uLit.value = lit;
      needle.visible = lit > 0.02;
    },

    dispose() {
      for (const g of geos) g.dispose();
      copperMat.dispose();
      signalMat.dispose();
      bits.dispose();
    },
  };
}
