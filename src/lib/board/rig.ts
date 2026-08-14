import { PerspectiveCamera, Vector3 } from 'three/webgpu';

interface Shot {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

const SHOTS: readonly Shot[] = [
  { p: 0, pos: [0, 372, 96], look: [0, 0, -4] },
  { p: 0.18, pos: [-52, 288, 232], look: [0, 4, -12] },
  { p: 0.34, pos: [14, 148, 288], look: [0, 12, -54] },
  { p: 0.48, pos: [0, 76, 322], look: [0, 40, -180] },
  { p: 0.62, pos: [0, 560, 1560], look: [0, 210, -20] },
  { p: 0.82, pos: [0, 380, 1440], look: [0, 170, -20] },
  { p: 1, pos: [0, 350, 1400], look: [0, 160, -20] },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export interface Rig {
  camera: PerspectiveCamera;
  apply(p: number, intro: number): void;
  resize(w: number, h: number): void;
}

export function rig(): Rig {
  const camera = new PerspectiveCamera(38, 1, 1, 6000);
  const pos = new Vector3();
  const look = new Vector3();
  const a = new Vector3();
  const b = new Vector3();

  return {
    camera,

    apply(p, intro) {
      const q = clamp01(p);

      let i = 0;
      while (i < SHOTS.length - 2 && q > SHOTS[i + 1].p) i++;
      const t0 = SHOTS[i];
      const t1 = SHOTS[i + 1];
      const k = smooth(clamp01((q - t0.p) / (t1.p - t0.p)));

      a.set(...t0.pos);
      b.set(...t1.pos);
      pos.lerpVectors(a, b, k);
      a.set(...t0.look);
      b.set(...t1.look);
      look.lerpVectors(a, b, k);

      if (intro < 1) {
        const push = 1 + (1 - intro) * (1 - intro) * 0.32;
        pos.sub(look).multiplyScalar(push).add(look);
      }

      camera.position.copy(pos);
      camera.lookAt(look);
      camera.updateProjectionMatrix();
    },

    resize(w, h) {
      const aspect = w / Math.max(1, h);
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 54 : 38;
      camera.updateProjectionMatrix();
    },
  };
}
