import { PerspectiveCamera, Vector3 } from 'three/webgpu';

interface Shot {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

const SHOTS: readonly Shot[] = [
  { p: 0, pos: [-300, 470, 560], look: [0, 110, -20] },
  { p: 0.18, pos: [-240, 420, 478], look: [0, 74, -18] },
  { p: 0.3, pos: [-186, 374, 414], look: [0, 44, -14] },
  { p: 0.52, pos: [-30, 196, 128], look: [26, 12, -52] },
  // down on the copper that leaves the processor for the memory slots
  { p: 0.68, pos: [64, 42, -34], look: [62, 0, -70] },
  { p: 0.84, pos: [10, 84, 40], look: [16, 22, -46] },
  // the package with its lid off, and the transistor blown up above it
  { p: 1, pos: [-30, 100, 130], look: [-6, 28, -24] },
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
