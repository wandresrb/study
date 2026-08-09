// El entorno que reflejan los metales.
//
// Sin esto la placa se ve negra, y no por falta de luces: un material metálico
// casi no tiene componente difusa, así que todo lo que muestra son reflejos. Si
// no hay nada que reflejar, el cobre es negro. Con dos luces direccionales lo
// único que sale es un filo de brillo — que es exactamente lo que pasaba.
//
// Se genera a mano en vez de cargar un HDRI: son 64x32 píxeles y evita meter
// un fichero de megabytes en una ruta que ya carga 155 KB de motor.

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

/** Interpola entre dos colores lineales [r,g,b]. */
function mezcla(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface Entorno {
  textura: ReturnType<PMREMGenerator['fromEquirectangular']>['texture'];
  soltar(): void;
}

/**
 * Un cielo de estudio: suelo oscuro, horizonte tibio y una franja alta más
 * clara que hace de fuente principal. Los valores van en espacio lineal.
 */
export function entorno(renderer: WebGPURenderer): Entorno {
  const datos = new Float32Array(AN * AL * 4);

  const suelo = [0.05, 0.05, 0.08];
  const horizonte = [0.42, 0.43, 0.58];
  const cenit = [1.5, 1.56, 2.0];

  for (let y = 0; y < AL; y++) {
    // v = 0 arriba, 1 abajo.
    const v = y / (AL - 1);
    const base =
      v < 0.5 ? mezcla(cenit, horizonte, Math.pow(v / 0.5, 0.7)) : mezcla(horizonte, suelo, (v - 0.5) / 0.5);

    for (let x = 0; x < AN; x++) {
      const u = x / (AN - 1);
      // Una fuente ancha en un lado: es la que dibuja el filo de luz a lo largo
      // de cada pista y la que hace que el cobre se lea como metal y no como
      // pintura gris.
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

  // Generar el PMREM deja el renderer apuntando a su propio destino. Sin
  // devolverlo al lienzo, todos los fotogramas siguientes se dibujan en una
  // textura que nadie mira — y la pantalla se queda en negro sin un solo error
  // en consola.
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
