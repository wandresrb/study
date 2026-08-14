import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardNodeMaterial,
} from 'three/webgpu';

import { SIDE } from './layout';

const EDGE_H = 5;

const smooth = (t: number) => t * t * (3 - 2 * t);
const band = (p: number, a: number, b: number) =>
  smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface Edge {
  group: Group;
  apply(p: number): void;
  dispose(): void;
}

export function edge(): Edge {
  const group = new Group();

  const geo = new BoxGeometry(SIDE, 1, SIDE);
  geo.translate(0, -0.5, 0);
  const mat = new MeshStandardNodeMaterial({
    color: 0x0f1018,
    metalness: 0.1,
    roughness: 0.82,
  });
  const box = new Mesh(geo, mat);
  box.castShadow = false;
  box.receiveShadow = true;
  box.position.y = -0.05;
  box.scale.y = 0.001;
  group.add(box);

  const wireGeo = new EdgesGeometry(new BoxGeometry(SIDE, EDGE_H, SIDE));
  const wireMat = new LineBasicMaterial({ color: 0x2a2c3e, transparent: true, opacity: 0 });
  const wire = new LineSegments(wireGeo, wireMat);
  wire.position.y = -EDGE_H / 2;
  group.add(wire);

  return {
    group,

    apply(p) {
      const rise = band(p, 0.28, 0.48);
      box.scale.y = Math.max(0.001, rise * EDGE_H);
      wireMat.opacity = rise * 0.9;
    },

    dispose() {
      geo.dispose();
      wireGeo.dispose();
      mat.dispose();
      wireMat.dispose();
    },
  };
}
