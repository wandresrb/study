import {
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  PMREMGenerator,
  RGBAFormat,
  type WebGPURenderer,
} from 'three/webgpu';

const W = 64;
const H = 32;

function mix(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface Environment {
  texture: ReturnType<PMREMGenerator['fromEquirectangular']>['texture'];
  dispose(): void;
}

export function environment(renderer: WebGPURenderer): Environment {
  const data = new Float32Array(W * H * 4);

  const ground = [0.05, 0.05, 0.08];
  const horizon = [0.42, 0.43, 0.58];
  const zenith = [1.5, 1.56, 2.0];

  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const base = v < 0.5 ? mix(zenith, horizon, Math.pow(v / 0.5, 0.7)) : mix(horizon, ground, (v - 0.5) / 0.5);

    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const ang = (u - 0.18) * Math.PI * 2;
      const spot = Math.exp(-(ang * ang) / 0.18) * Math.exp(-((v - 0.26) * (v - 0.26)) / 0.02);
      const o = (y * W + x) * 4;
      data[o] = base[0] + spot * 8;
      data[o + 1] = base[1] + spot * 8.4;
      data[o + 2] = base[2] + spot * 9.5;
      data[o + 3] = 1;
    }
  }

  const raw = new DataTexture(data, W, H, RGBAFormat, FloatType);
  raw.mapping = EquirectangularReflectionMapping;
  raw.needsUpdate = true;

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(raw);

  renderer.setRenderTarget(null);

  raw.dispose();
  pmrem.dispose();

  return {
    texture: target.texture,
    dispose() {
      target.dispose();
    },
  };
}
