import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardNodeMaterial,
} from 'three/webgpu';

import { LADO } from './layout';

const CANTO = 5;

const suave = (t: number) => t * t * (3 - 2 * t);
const franja = (p: number, a: number, b: number) =>
  suave(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface Canto {
  grupo: Group;
  aplicar(p: number): void;
  soltar(): void;
}

export function canto(): Canto {
  const grupo = new Group();

  const geo = new BoxGeometry(LADO, 1, LADO);
  geo.translate(0, -0.5, 0);
  const mat = new MeshStandardNodeMaterial({
    color: 0x0f1018,
    metalness: 0.1,
    roughness: 0.82,
  });
  const caja = new Mesh(geo, mat);
  caja.castShadow = false;
  caja.receiveShadow = true;
  caja.position.y = -0.05;
  caja.scale.y = 0.001;
  grupo.add(caja);

  const geoFilo = new EdgesGeometry(new BoxGeometry(LADO, CANTO, LADO));
  const matFilo = new LineBasicMaterial({ color: 0x2a2c3e, transparent: true, opacity: 0 });
  const filo = new LineSegments(geoFilo, matFilo);
  filo.position.y = -CANTO / 2;
  grupo.add(filo);

  return {
    grupo,

    aplicar(p) {
      const oblicua = franja(p, 0.28, 0.48);
      caja.scale.y = Math.max(0.001, oblicua * CANTO);
      matFilo.opacity = oblicua * 0.9;
    },

    soltar() {
      geo.dispose();
      geoFilo.dispose();
      mat.dispose();
      matFilo.dispose();
    },
  };
}
