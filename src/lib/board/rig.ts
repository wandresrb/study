import { PerspectiveCamera, Vector3 } from 'three/webgpu';

interface Toma {
  p: number;
  pos: [number, number, number];
  mira: [number, number, number];
}

const TOMAS: readonly Toma[] = [
  { p: 0, pos: [0, 372, 96], mira: [0, 0, -4] },
  { p: 0.18, pos: [-52, 288, 232], mira: [0, 4, -12] },
  { p: 0.34, pos: [14, 148, 288], mira: [0, 12, -54] },
  { p: 0.48, pos: [0, 76, 322], mira: [0, 40, -180] },
  { p: 0.62, pos: [0, 560, 1560], mira: [0, 210, -20] },
  { p: 0.82, pos: [0, 380, 1440], mira: [0, 170, -20] },
  { p: 1, pos: [0, 350, 1400], mira: [0, 160, -20] },
];

const suave = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export interface Rig {
  camara: PerspectiveCamera;
  aplicar(p: number, intro: number): void;
  redimensionar(w: number, h: number): void;
}

export function rig(): Rig {
  const camara = new PerspectiveCamera(38, 1, 1, 6000);
  const pos = new Vector3();
  const mira = new Vector3();
  const a = new Vector3();
  const b = new Vector3();

  return {
    camara,

    aplicar(p, intro) {
      const q = clamp01(p);

      let i = 0;
      while (i < TOMAS.length - 2 && q > TOMAS[i + 1].p) i++;
      const t0 = TOMAS[i];
      const t1 = TOMAS[i + 1];
      const k = suave(clamp01((q - t0.p) / (t1.p - t0.p)));

      a.set(...t0.pos);
      b.set(...t1.pos);
      pos.lerpVectors(a, b, k);
      a.set(...t0.mira);
      b.set(...t1.mira);
      mira.lerpVectors(a, b, k);

      if (intro < 1) {
        const empuje = 1 + (1 - intro) * (1 - intro) * 0.32;
        pos.sub(mira).multiplyScalar(empuje).add(mira);
      }

      camara.position.copy(pos);
      camara.lookAt(mira);
      camara.updateProjectionMatrix();
    },

    redimensionar(w, h) {
      const aspecto = w / Math.max(1, h);
      camara.aspect = aspecto;
      camara.fov = aspecto < 1 ? 54 : 38;
      camara.updateProjectionMatrix();
    },
  };
}
