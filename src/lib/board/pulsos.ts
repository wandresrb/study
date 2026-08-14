import {
  AdditiveBlending,
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  Mesh,
  MeshBasicNodeMaterial,
  NearestFilter,
  RGBAFormat,
} from 'three/webgpu';
import { color, texture, uv } from 'three/tsl';

import { enTaladro } from './agujeros';
import { azar } from './layout';
import { buses, type Punto } from './trazas';

const ALTO = 0.09;
const ANCHO = 0.45;
const TINTE = 0xa9b6ff;

interface Ciclo {
  proxima: number;
  desde: number;
  subida: number;
  sostenido: number;
  bajada: number;
  pico: number;
}

export interface Pulsos {
  malla: Mesh;
  actualizar(t: number, intensidad: number): void;
  soltar(): void;
}

export function pulsos(): Pulsos {
  const rnd = azar(0x7e11a5);

  const pistas: Punto[][] = [];
  for (const h of buses()) pistas.push(...h.pistas);

  const pos: number[] = [];
  const ids: number[] = [];
  const idx: number[] = [];
  let v = 0;

  pistas.forEach((p, id) => {
    for (let i = 1; i < p.length; i++) {
      const [x0, z0] = p[i - 1];
      const [x1, z1] = p[i];
      if (
        enTaladro(x0, z0, 0.6) ||
        enTaladro(x1, z1, 0.6) ||
        enTaladro((x0 + x1) / 2, (z0 + z1) / 2, 0.6) ||
        enTaladro((x0 * 3 + x1) / 4, (z0 * 3 + z1) / 4, 0.6) ||
        enTaladro((x0 + x1 * 3) / 4, (z0 + z1 * 3) / 4, 0.6)
      ) {
        continue;
      }
      let dx = x1 - x0;
      let dz = z1 - z0;
      const largo = Math.hypot(dx, dz) || 1;
      dx /= largo;
      dz /= largo;

      const ex = dx * (ANCHO / 2);
      const ez = dz * (ANCHO / 2);
      const nx = -dz * (ANCHO / 2);
      const nz = dx * (ANCHO / 2);

      const ax = x0 - ex;
      const az = z0 - ez;
      const bx = x1 + ex;
      const bz = z1 + ez;

      pos.push(
        ax - nx, ALTO, az - nz,
        ax + nx, ALTO, az + nz,
        bx + nx, ALTO, bz + nz,
        bx - nx, ALTO, bz - nz,
      );
      const u = (id + 0.5) / pistas.length;
      ids.push(u, 0.5, u, 0.5, u, 0.5, u, 0.5);
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
  });

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(ids, 2));
  geo.setIndex(idx);

  const datos = new Uint8Array(pistas.length * 4);
  const tabla = new DataTexture(datos, pistas.length, 1, RGBAFormat);
  tabla.magFilter = NearestFilter;
  tabla.minFilter = NearestFilter;
  tabla.generateMipmaps = false;
  tabla.needsUpdate = true;

  const material = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const brillo = texture(tabla, uv()).r;
  material.colorNode = color(TINTE).mul(brillo);
  material.opacityNode = brillo;

  const malla = new Mesh(geo, material);
  malla.frustumCulled = false;

  const ciclos: Ciclo[] = pistas.map(() => ({
    proxima: rnd() * 9,
    desde: -99,
    subida: 0.05 + rnd() * 0.09,
    sostenido: 0.1 + rnd() * 0.24,
    bajada: 0.5 + rnd() * 0.9,
    pico: 0.34 + rnd() * 0.3,
  }));

  return {
    malla,

    actualizar(t, intensidad) {
      for (let i = 0; i < ciclos.length; i++) {
        const c = ciclos[i];
        if (t >= c.proxima) {
          c.desde = t;
          c.proxima = t + (rnd() < 0.25 ? 0.2 + rnd() * 0.5 : 2.5 + rnd() * 9);
        }

        const d = t - c.desde;
        let a = 0;
        if (d >= 0) {
          if (d < c.subida) a = d / c.subida;
          else if (d < c.subida + c.sostenido) a = 1;
          else {
            const f = (d - c.subida - c.sostenido) / c.bajada;
            a = f < 1 ? 1 - f * f : 0;
          }
        }

        const val = Math.round(Math.min(1, a * c.pico * intensidad) * 255);
        datos[i * 4] = val;
        datos[i * 4 + 1] = val;
        datos[i * 4 + 2] = val;
        datos[i * 4 + 3] = 255;
      }
      tabla.needsUpdate = true;
    },

    soltar() {
      geo.dispose();
      material.dispose();
      tabla.dispose();
    },
  };
}
