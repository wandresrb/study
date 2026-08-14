import {
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  PMREMGenerator,
  RGBAFormat,
  type WebGPURenderer,
} from 'three/webgpu';

const AN = 64;
const AL = 32;

function mezcla(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface Entorno {
  textura: ReturnType<PMREMGenerator['fromEquirectangular']>['texture'];
  soltar(): void;
}

export function entorno(renderer: WebGPURenderer): Entorno {
  const datos = new Float32Array(AN * AL * 4);

  const suelo = [0.05, 0.05, 0.08];
  const horizonte = [0.42, 0.43, 0.58];
  const cenit = [1.5, 1.56, 2.0];

  for (let y = 0; y < AL; y++) {
    const v = y / (AL - 1);
    const base =
      v < 0.5 ? mezcla(cenit, horizonte, Math.pow(v / 0.5, 0.7)) : mezcla(horizonte, suelo, (v - 0.5) / 0.5);

    for (let x = 0; x < AN; x++) {
      const u = x / (AN - 1);
      const ang = (u - 0.18) * Math.PI * 2;
      const foco = Math.exp(-(ang * ang) / 0.18) * Math.exp(-((v - 0.26) * (v - 0.26)) / 0.02);
      const o = (y * AN + x) * 4;
      datos[o] = base[0] + foco * 8;
      datos[o + 1] = base[1] + foco * 8.4;
      datos[o + 2] = base[2] + foco * 9.5;
      datos[o + 3] = 1;
    }
  }

  const cruda = new DataTexture(datos, AN, AL, RGBAFormat, FloatType);
  cruda.mapping = EquirectangularReflectionMapping;
  cruda.needsUpdate = true;

  const pmrem = new PMREMGenerator(renderer);
  const destino = pmrem.fromEquirectangular(cruda);

  renderer.setRenderTarget(null);

  cruda.dispose();
  pmrem.dispose();

  return {
    textura: destino.texture,
    soltar() {
      destino.dispose();
    },
  };
}
