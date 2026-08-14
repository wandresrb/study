import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  type MeshStandardNodeMaterial,
  Object3D,
} from 'three/webgpu';

import {
  COILS,
  HEADERS,
  CAPACITORS,
  CAPACITOR_RADIUS,
  THICKNESS,
  HEADER_PIN_PITCH,
  BATTERY,
  ZONES,
  type Zone,
} from './layout';
import { holes } from './holes';
import { processor } from './processor';
import { FOOTPRINTS, type Part } from './seeding';

export interface Materials {
  substrate: MeshStandardNodeMaterial;
  aluminum: MeshStandardNodeMaterial;
  plastic: MeshStandardNodeMaterial;
  contact: MeshStandardNodeMaterial;
  channel: MeshStandardNodeMaterial;
  body: MeshStandardNodeMaterial;
  accent: MeshStandardNodeMaterial;
  steel: MeshStandardNodeMaterial;
  fineContact: MeshStandardNodeMaterial;
}

const mold = new Object3D();

function heatsink(s: Zone, m: Materials): Group {
  const g = new Group();
  const base = new Mesh(new BoxGeometry(s.w, s.h * 0.34, s.d), m.aluminum);
  base.position.set(s.x, (s.h * 0.34) / 2, s.z);
  g.add(base);

  const lengthwise = s.d > s.w;
  const length = lengthwise ? s.d : s.w;
  const width = lengthwise ? s.w : s.d;
  const n = Math.max(3, Math.round(width / 4.4));
  const fins = new InstancedMesh(new BoxGeometry(1, 1, 1), m.aluminum, n);
  fins.frustumCulled = false;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * (width - 2.4);
    mold.position.set(
      s.x + (lengthwise ? t : 0),
      s.h * 0.34 + (s.h * 0.66) / 2,
      s.z + (lengthwise ? 0 : t),
    );
    mold.rotation.set(0, 0, 0);
    mold.scale.set(lengthwise ? 1.7 : length - 2, s.h * 0.66, lengthwise ? length - 2 : 1.7);
    mold.updateMatrix();
    fins.setMatrixAt(i, mold.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  g.add(fins);
  return g;
}

function slot(s: Zone, m: Materials): Group {
  const g = new Group();
  const lengthwise = s.d > s.w;
  const length = lengthwise ? s.d : s.w;
  const width = lengthwise ? s.w : s.d;
  const height = s.h;

  const body = new Group();

  const wall = width * 0.3;
  const gap = width - wall * 2;
  for (const side of [-1, 1]) {
    const w = new Mesh(new BoxGeometry(wall, height, length), m.plastic);
    w.position.set(side * (width / 2 - wall / 2), height / 2, 0);
    body.add(w);
  }

  for (const side of [-1, 1]) {
    const c = new Mesh(new BoxGeometry(width, height, wall), m.plastic);
    c.position.set(0, height / 2, side * (length / 2 - wall / 2));
    body.add(c);
  }

  const bottom = new Mesh(new BoxGeometry(gap, height * 0.3, length - wall * 2), m.channel);
  bottom.position.set(0, height * 0.15, 0);
  body.add(bottom);

  const NOTCH: Record<string, number> = { pcie16: 0.17, pcie1: 0.26, atx: 0.5 };
  const f = NOTCH[s.id] ?? 0.44;
  const divider = new Mesh(new BoxGeometry(gap, height * 0.72, 2.2), m.contact);
  divider.position.set(0, height * 0.36, (f - 0.5) * length);
  body.add(divider);

  if (s.id.startsWith('dimm') || s.id === 'pcie16' || s.id === 'pcie1') {
    for (const side of s.id.startsWith('dimm') ? [-1, 1] : [1]) {
      const latch = new Group();
      const segments: [number, number, number, number][] = [
        [width * 1.5, height * 0.85, 5.2, height * 0.42],
        [width * 1.1, height * 0.7, 3.2, height * 1.1],
        [width * 1.7, height * 0.4, 4.4, height * 1.62],
      ];
      for (const [w, h, d, cy] of segments) {
        const c = new Mesh(new BoxGeometry(w, h, d), m.plastic);
        c.position.set(0, cy, 0);
        latch.add(c);
      }
      latch.position.z = side * (length / 2 + 3);
      body.add(latch);
    }
  }

  if (s.id === 'pcie16') {
    for (const side of [-1, 1]) {
      const b = new Mesh(new BoxGeometry(1.2, height * 0.9, length), m.plastic);
      b.position.set(side * (width / 2 + 0.6), height * 0.5, 0);
      body.add(b);
    }
  }

  if (!lengthwise) body.rotation.y = Math.PI / 2;
  body.position.set(s.x, 0, s.z);
  g.add(body);
  return g;
}

export function relief(m: Materials, sites: readonly Part[]): Group {
  const g = new Group();
  for (const s of ZONES) {
    switch (s.kind) {
      case 'heatsink':
        g.add(heatsink(s, m));
        break;
      case 'slot': {
        g.add(slot(s, m));
        break;
      }
      case 'cpu':
        g.add(processor(s.x, s.z, m));
        break;
      case 'shell': {
        const c = new Mesh(new BoxGeometry(s.w, s.h, s.d), m.plastic);
        c.position.set(s.x, s.h / 2, s.z);
        g.add(c);
        break;
      }
      case 'board': {
        const p = new Mesh(new BoxGeometry(s.w, s.h, s.d), m.body);
        p.position.set(s.x, s.h / 2, s.z);
        g.add(p);
        break;
      }
    }
  }

  const metal = sites.filter((s) => s.t < 0.2);
  const matte = sites.filter((s) => s.t >= 0.2);

  const tint = new Color();
  const dark = new Color(0x24263a);
  const plant = (list: typeof sites, mat: MeshStandardNodeMaterial, tinted: boolean) => {
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), mat, list.length);
    mesh.frustumCulled = false;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const f = FOOTPRINTS[s.footprint];
      mold.position.set(s.x, f.h / 2, s.z);
      mold.rotation.set(0, s.rot === 1 ? Math.PI / 2 : 0, 0);
      mold.scale.set(f.w, f.h, f.d);
      mold.updateMatrix();
      mesh.setMatrixAt(i, mold.matrix);
      if (tinted) {
        tint.copy(dark).multiplyScalar(0.75 + s.t * 0.7);
        mesh.setColorAt(i, tint);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    g.add(mesh);
    return mesh;
  };
  plant(matte, m.body, true);
  plant(metal, m.aluminum, false);
  const chipSites = sites;

  const chip = chipSites.filter((s) => s.footprint !== 'soic' && s.footprint !== 'dfn');
  const terminals = new InstancedMesh(new BoxGeometry(1, 1, 1), m.contact, chip.length * 2);
  terminals.frustumCulled = false;
  let nc = 0;
  for (const s of chip) {
    const f = FOOTPRINTS[s.footprint];
    const length = f.w;
    const width = f.d;
    const cap = length * 0.26;
    for (const side of [-1, 1]) {
      const d = side * (length / 2 - cap / 2);
      mold.position.set(
        s.x + (s.rot === 1 ? 0 : d),
        f.h * 0.52,
        s.z + (s.rot === 1 ? d : 0),
      );
      mold.rotation.set(0, s.rot === 1 ? Math.PI / 2 : 0, 0);
      mold.scale.set(cap, f.h * 1.04, width * 1.06);
      mold.updateMatrix();
      terminals.setMatrixAt(nc++, mold.matrix);
    }
  }
  terminals.count = nc;
  terminals.instanceMatrix.needsUpdate = true;
  g.add(terminals);

  const coil = FOOTPRINTS.coil;
  const coils = new InstancedMesh(new BoxGeometry(1, 1, 1), m.body, COILS.length);
  coils.frustumCulled = false;
  COILS.forEach((b, i) => {
    mold.position.set(b.x, coil.h / 2, b.z);
    mold.rotation.set(0, 0, 0);
    mold.scale.set(coil.w, coil.h, coil.d);
    mold.updateMatrix();
    coils.setMatrixAt(i, mold.matrix);
  });
  coils.instanceMatrix.needsUpdate = true;
  g.add(coils);

  const coilTops = new InstancedMesh(new BoxGeometry(1, 1, 1), m.contact, COILS.length);
  coilTops.frustumCulled = false;
  COILS.forEach((b, i) => {
    mold.position.set(b.x, coil.h + 0.25, b.z);
    mold.rotation.set(0, 0, 0);
    mold.scale.set(coil.w * 0.82, 0.5, coil.d * 0.82);
    mold.updateMatrix();
    coilTops.setMatrixAt(i, mold.matrix);
  });
  coilTops.instanceMatrix.needsUpdate = true;
  g.add(coilTops);

  const caps = new InstancedMesh(new CylinderGeometry(1, 1, 1, 24), m.body, CAPACITORS.length);
  caps.frustumCulled = false;
  CAPACITORS.forEach(({ x, z }, i) => {
    const r = CAPACITOR_RADIUS;
    const h = 9.5;
    mold.position.set(x, h / 2, z);
    mold.rotation.set(0, 0, 0);
    mold.scale.set(r, h, r);
    mold.updateMatrix();
    caps.setMatrixAt(i, mold.matrix);
  });
  caps.instanceMatrix.needsUpdate = true;
  g.add(caps);

  const capTops = new InstancedMesh(new CylinderGeometry(1, 1, 1, 20), m.contact, CAPACITORS.length);
  capTops.frustumCulled = false;
  CAPACITORS.forEach(({ x, z }, i) => {
    mold.position.set(x, 9.7, z);
    mold.rotation.set(0, 0, 0);
    mold.scale.set(CAPACITOR_RADIUS * 0.86, 0.4, CAPACITOR_RADIUS * 0.86);
    mold.updateMatrix();
    capTops.setMatrixAt(i, mold.matrix);
  });
  capTops.instanceMatrix.needsUpdate = true;
  g.add(capTops);

  const CONTACT_PITCH = 0.85;
  const slots = ZONES.filter((z) => z.kind === 'slot');
  let totalContacts = 0;
  for (const z of slots) {
    const length = Math.max(z.w, z.d);
    totalContacts += Math.floor(length / CONTACT_PITCH) * 2;
  }
  const contacts = new InstancedMesh(new BoxGeometry(1, 1, 1), m.body, totalContacts);
  contacts.frustumCulled = false;
  let ncon = 0;
  for (const z of slots) {
    const lengthwise = z.d > z.w;
    const length = lengthwise ? z.d : z.w;
    const width = lengthwise ? z.w : z.d;
    const n = Math.floor(length / CONTACT_PITCH);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * (length - 3);
      for (const side of [-1, 1]) {
        const off = side * width * 0.16;
        mold.position.set(
          z.x + (lengthwise ? off : t),
          z.h * 0.6,
          z.z + (lengthwise ? t : off),
        );
        mold.rotation.set(0, 0, 0);
        mold.scale.set(lengthwise ? 0.36 : 0.44, z.h * 0.36, lengthwise ? 0.44 : 0.36);
        mold.updateMatrix();
        contacts.setMatrixAt(ncon++, mold.matrix);
      }
    }
  }
  contacts.count = ncon;
  contacts.instanceMatrix.needsUpdate = true;
  g.add(contacts);

  let totalPins = 0;
  for (const c of HEADERS) totalPins += c.pins * 2;

  const sockets = new InstancedMesh(new BoxGeometry(1, 1, 1), m.plastic, HEADERS.length);
  sockets.frustumCulled = false;
  HEADERS.forEach((c, i) => {
    const width = c.pins * HEADER_PIN_PITCH;
    mold.position.set(c.x + width / 2 - HEADER_PIN_PITCH / 2, 1.2, c.z);
    mold.rotation.set(0, 0, 0);
    mold.scale.set(width, 2.4, HEADER_PIN_PITCH * 2);
    mold.updateMatrix();
    sockets.setMatrixAt(i, mold.matrix);
  });
  sockets.instanceMatrix.needsUpdate = true;
  g.add(sockets);

  const pins = new InstancedMesh(new BoxGeometry(1, 1, 1), m.contact, totalPins);
  pins.frustumCulled = false;
  let np = 0;
  for (const c of HEADERS) {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < c.pins; i++) {
        mold.position.set(
          c.x + i * HEADER_PIN_PITCH,
          3.2,
          c.z + (row - 0.5) * HEADER_PIN_PITCH,
        );
        mold.rotation.set(0, 0, 0);
        mold.scale.set(0.64, 4, 0.64);
        mold.updateMatrix();
        pins.setMatrixAt(np++, mold.matrix);
      }
    }
  }
  pins.instanceMatrix.needsUpdate = true;
  g.add(pins);

  const battery = new Mesh(new CylinderGeometry(BATTERY.r, BATTERY.r, 3.2, 28), m.steel);
  battery.position.set(BATTERY.x, 1.6, BATTERY.z);
  g.add(battery);
  const cradle = new Mesh(new BoxGeometry(BATTERY.r * 2.3, 1.4, BATTERY.r * 1.5), m.plastic);
  cradle.position.set(BATTERY.x, 0.7, BATTERY.z);
  g.add(cradle);
  const clip = new Mesh(new BoxGeometry(3, 4.4, 6), m.steel);
  clip.position.set(BATTERY.x + BATTERY.r + 1.4, 2.2, BATTERY.z);
  g.add(clip);

  const withScrew = ZONES.filter((z) => z.kind === 'board' || z.id === 'chipset');
  const screws = new InstancedMesh(new CylinderGeometry(1.6, 1.6, 1.2, 12), m.steel, withScrew.length * 2);
  screws.frustumCulled = false;
  let nt = 0;
  for (const z of withScrew) {
    for (const side of [-1, 1]) {
      mold.position.set(z.x + side * (z.w / 2 - 3), z.h + 0.4, z.z);
      mold.rotation.set(0, 0, 0);
      mold.scale.set(1, 1, 1);
      mold.updateMatrix();
      screws.setMatrixAt(nt++, mold.matrix);
    }
  }
  screws.instanceMatrix.needsUpdate = true;
  g.add(screws);

  const PETALS = 6;
  const PETAL_RADIUS = 1.35;
  const HOLES = holes();
  const petals = new InstancedMesh(new BoxGeometry(1, 1, 1), m.steel, HOLES.length * PETALS);
  petals.frustumCulled = false;
  let ne = 0;
  for (const t of HOLES) {
    for (let k = 0; k < PETALS; k++) {
      const a = (k / PETALS) * Math.PI * 2;
      mold.position.set(t.x + Math.cos(a) * PETAL_RADIUS, 0.45, t.z + Math.sin(a) * PETAL_RADIUS);
      mold.rotation.set(0, -a, 0);
      mold.scale.set(0.62, 0.34, 1.0);
      mold.updateMatrix();
      petals.setMatrixAt(ne++, mold.matrix);
    }
  }
  petals.instanceMatrix.needsUpdate = true;
  g.add(petals);

  const washers = new InstancedMesh(new CylinderGeometry(1.95, 1.95, 0.26, 20), m.contact, HOLES.length);
  washers.frustumCulled = false;
  HOLES.forEach((t, i) => {
    mold.position.set(t.x, 0.18, t.z);
    mold.rotation.set(0, 0, 0);
    mold.scale.set(1, 1, 1);
    mold.updateMatrix();
    washers.setMatrixAt(i, mold.matrix);
  });
  washers.instanceMatrix.needsUpdate = true;
  g.add(washers);

  const core = new Mesh(new BoxGeometry(244, THICKNESS, 244), m.substrate);
  core.position.y = -THICKNESS / 2;
  g.add(core);

  return g;
}
