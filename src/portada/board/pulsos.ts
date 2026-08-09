// El encendido de los buses.
//
// No hay destellos viajando por la pista: lo que se enciende es **la pista
// entera**, de golpe, y se apaga despacio. Un punto recorriendo el trazado
// obliga a que el punto sea grande para verse, y entonces choca con lo que se
// buscaba — pistas diminutas y luz delicada. Encendiendo el trazo completo, la
// luz puede ser tan fina como la pista, porque su presencia la da el largo y no
// el tamaño.
//
// Toda la geometría va en una sola malla y el brillo de cada pista vive en una
// textura de 1 píxel de alto, una columna por pista. El vértice lleva su índice
// y busca ahí su brillo, así que animar cien pistas cuesta escribir cien bytes
// por fotograma y una sola llamada de dibujo.

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

/** Justo por encima de la máscara: es luz sobre la pista, no un objeto. */
const ALTO = 0.09;
/** Tan fina como la pista que ilumina. */
const ANCHO = 0.45;
const TINTE = 0xa9b6ff;

interface Ciclo {
  /** Cuándo vuelve a encenderse. */
  proxima: number;
  /** Cuándo se encendió. */
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

  // Una polilínea por pista de todos los haces.
  const pistas: Punto[][] = [];
  for (const h of buses()) pistas.push(...h.pistas);

  // --- Geometría: una cinta por tramo --------------------------------------
  const pos: number[] = [];
  const ids: number[] = [];
  const idx: number[] = [];
  let v = 0;

  // Una placa no rutea por encima de un taladro: alrededor del agujero hay una
  // corona desnuda donde apoya el tornillo. En la textura el círculo tapa la
  // pista, pero estas cintas son geometría y flotan por encima — pasaban por
  // encima del anillo como si nada.
  pistas.forEach((p, id) => {
    for (let i = 1; i < p.length; i++) {
      const [x0, z0] = p[i - 1];
      const [x1, z1] = p[i];
      // Se corta el tramo entero si roza un taladro: partirlo por la mitad
      // dejaría un muñón asomando bajo la arandela.
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

      // Se alarga medio ancho por cada punta para que los codos no dejen
      // muesca.
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
      // La coordenada de búsqueda del brillo, ya centrada en su píxel. Va en
      // el `uv` de la geometría en vez de en un atributo propio: así el
      // material la lee con `uv()` y no hace falta declarar nada a mano.
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

  // --- La tabla de brillos --------------------------------------------------
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
  // El propio brillo hace de opacidad: una pista apagada no debe sumar nada.
  material.opacityNode = brillo;

  const malla = new Mesh(geo, material);
  malla.frustumCulled = false;

  // --- El ciclo de cada pista ----------------------------------------------
  const ciclos: Ciclo[] = pistas.map(() => ({
    // Se reparten en el tiempo para que no arranquen todas juntas.
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
          // Rachas irregulares: a veces dos seguidas, a veces un silencio
          // largo. Un intervalo fijo se lee como parpadeo de decoración.
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
