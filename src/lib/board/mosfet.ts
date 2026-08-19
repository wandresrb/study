import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicNodeMaterial,
  TorusGeometry,
} from 'three/webgpu';
import { color, smoothstep, uniform, uv } from 'three/tsl';

import type { Materials } from './parts';

const BULK = { w: 34, h: 3, d: 20 };
const PAD = { w: 9, h: 2.6, d: 15, x: 11.5 };
const GATE = { w: 10, h: 3.2, d: 12 };
const OXIDE_H = 0.5;
// Wider than the gate on purpose: otherwise the channel lights where nobody
// can see it, hidden under the very thing that summons it.
const CHANNEL = { w: 12.6, h: 0.7, d: 18 };

const ON = 0xffb37a;
const HOT = 0xffd9a8;

/** The path the current takes when the channel is open: drain, channel, source. */
const FLOW: [number, number][] = [
  [PAD.x, 1.4],
  [7.5, 0.1],
  [-7.5, 0.1],
  [-PAD.x, 1.4],
];

/** A flat ribbon along a 2D path, with u running 0→1 over its length. */
function ribbon(path: readonly [number, number][], width: number): BufferGeometry {
  const at = [0];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    at.push(total);
  }

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  let v = 0;

  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const u0 = at[i - 1] / total;
    const u1 = at[i] / total;
    const h = width / 2;

    pos.push(x0, y0, -h, x0, y0, h, x1, y1, h, x1, y1, -h);
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

export interface Mosfet {
  group: Group;
  set(t: number, gate: number, flow: number, lit: number): void;
  dispose(): void;
}

/**
 * One transistor, blown up and hung over the board like the detail balloon of
 * an exploded view: the jump in scale is declared, not faked with a zoom.
 * The gate voltage opens the channel; the current only crosses when it is open.
 */
export function mosfet(m: Materials, from: readonly [number, number, number], at: readonly [number, number, number]): Mosfet {
  const group = new Group();
  const geos: BufferGeometry[] = [];

  const device = new Group();
  device.position.set(at[0], at[1], at[2]);
  device.rotation.y = -0.42;
  group.add(device);

  const box = (w: number, h: number, d: number, x: number, y: number, mat: Materials[keyof Materials]) => {
    const geo = new BoxGeometry(w, h, d);
    geos.push(geo);
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    device.add(mesh);
    return mesh;
  };

  box(BULK.w, BULK.h, BULK.d, 0, -BULK.h / 2, m.channel);
  box(PAD.w, PAD.h, PAD.d, -PAD.x, PAD.h / 2 - 0.4, m.contact);
  box(PAD.w, PAD.h, PAD.d, PAD.x, PAD.h / 2 - 0.4, m.contact);
  box(GATE.w, OXIDE_H, GATE.d, 0, OXIDE_H / 2, m.plastic);
  box(GATE.w, GATE.h, GATE.d, 0, OXIDE_H + GATE.h / 2, m.steel);

  // Three contacts, each standing on the terminal it belongs to.
  const legGeo = new CylinderGeometry(0.75, 0.75, 4.4, 12);
  geos.push(legGeo);
  const padGeo = new BoxGeometry(3.4, 0.6, 3.4);
  geos.push(padGeo);
  for (const [x, base] of [
    [-PAD.x, PAD.h - 0.4],
    [0, OXIDE_H + GATE.h],
    [PAD.x, PAD.h - 0.4],
  ] as const) {
    const leg = new Mesh(legGeo, m.steel);
    leg.position.set(x, base + 2.2, 0);
    device.add(leg);
    const cap = new Mesh(padGeo, m.contact);
    cap.position.set(x, base + 4.7, 0);
    device.add(cap);
  }

  // The channel: it does not exist until the gate pulls it into being.
  const uOn = uniform(0);
  const channelMat = new MeshBasicNodeMaterial({ blending: AdditiveBlending, depthWrite: false, transparent: true });
  channelMat.colorNode = color(ON);
  channelMat.opacityNode = uOn;
  const channelGeo = new BoxGeometry(CHANNEL.w, CHANNEL.h, CHANNEL.d);
  geos.push(channelGeo);
  const channel = new Mesh(channelGeo, channelMat);
  channel.position.set(0, CHANNEL.h / 2, 0);
  device.add(channel);

  // The current, once there is a path for it.
  const uTime = uniform(0);
  const uFlow = uniform(0);
  const flowMat = new MeshBasicNodeMaterial({ blending: AdditiveBlending, depthWrite: false, transparent: true });
  const head = uTime.mul(0.55).fract();
  const glow = smoothstep(0.1, 0, uv().x.sub(head).abs()).mul(uFlow);
  flowMat.colorNode = color(HOT).mul(glow);
  flowMat.opacityNode = glow;
  const flowGeo = ribbon(FLOW, 2.4);
  geos.push(flowGeo);
  const flow = new Mesh(flowGeo, flowMat);
  flow.frustumCulled = false;
  device.add(flow);

  // The balloon: an outline that says this is a magnification, and the leader
  // back to the speck of silicon it was taken from.
  const frameGeo = new EdgesGeometry(new BoxGeometry(BULK.w + 7, 15, BULK.d + 7));
  geos.push(frameGeo);
  const frameMat = new LineBasicMaterial({ color: 0x8f96b4, transparent: true, opacity: 0.6 });
  const frame = new LineSegments(frameGeo, frameMat);
  frame.position.y = 4;
  device.add(frame);

  const leaderGeo = new BufferGeometry();
  leaderGeo.setAttribute('position', new Float32BufferAttribute([...from, ...at], 3));
  geos.push(leaderGeo);
  const leaderMat = new LineBasicMaterial({ color: 0x6f748c, transparent: true, opacity: 0.5 });
  const leader = new LineSegments(leaderGeo, leaderMat);
  group.add(leader);

  const ringGeo = new TorusGeometry(1.1, 0.14, 8, 24);
  geos.push(ringGeo);
  const ring = new Mesh(ringGeo, m.steel);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(from[0], from[1], from[2]);
  group.add(ring);

  group.visible = false;

  return {
    group,

    set(t, on, conducting, lit) {
      group.visible = lit > 0.02;
      uTime.value = t;
      uOn.value = on * lit * 0.85;
      uFlow.value = conducting * lit;
      frameMat.opacity = 0.6 * lit;
      leaderMat.opacity = 0.5 * lit;
    },

    dispose() {
      for (const g of geos) g.dispose();
      channelMat.dispose();
      flowMat.dispose();
      frameMat.dispose();
      leaderMat.dispose();
    },
  };
}
