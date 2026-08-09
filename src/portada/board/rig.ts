// El recorrido de cámara: de mirar la placa a que la placa sea el suelo.
//
// Cuatro tomas encadenadas. Se especifican posición y punto de mira por
// separado, en vez de orbitar un objetivo, porque lo que importa es el encuadre
// exacto del final.
//
// Ese final es deliberadamente *casi* plano y no del todo: la cámara se queda a
// unos doce grados sobre la placa. Con menos, la superficie se pierde por
// escorzo y la serigrafía deja de leerse; con más, deja de parecer un suelo. Y
// la mira apunta por encima del borde lejano para que la losa se apoye en la
// mitad de abajo del cuadro y quede sitio libre arriba — que es donde entrarán
// las capas siguientes.

import { PerspectiveCamera, Vector3 } from 'three/webgpu';

interface Toma {
  /** Avance al que se alcanza esta toma. */
  p: number;
  pos: [number, number, number];
  mira: [number, number, number];
}

const TOMAS: readonly Toma[] = [
  // Arranca siendo una placa: casi cenital y llenando el encuadre.
  { p: 0, pos: [0, 372, 96], mira: [0, 0, -4] },
  // Cabecea y desciende. La placa deja de ser lámina.
  { p: 0.36, pos: [-52, 288, 232], mira: [0, 4, -12] },
  // Aparecen los bordes: ya es un objeto, no una superficie.
  { p: 0.72, pos: [14, 148, 288], mira: [0, 12, -54] },
  // Casi plana. La losa se apoya abajo y arriba queda todo el hueco.
  { p: 1, pos: [0, 76, 322], mira: [0, 60, -260] },
];

const suave = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export interface Rig {
  camara: PerspectiveCamera;
  aplicar(p: number, intro: number): void;
  redimensionar(w: number, h: number): void;
}

export function rig(): Rig {
  const camara = new PerspectiveCamera(38, 1, 1, 4000);
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

      // La llegada. Al cargar, la cámara está más lejos y se acerca. Se aleja
      // respecto al punto de mira, así el encuadre no cambia: solo la
      // distancia.
      if (intro < 1) {
        const empuje = 1 + (1 - intro) * (1 - intro) * 1.15;
        pos.sub(mira).multiplyScalar(empuje).add(mira);
      }

      camara.position.copy(pos);
      camara.lookAt(mira);
    },

    redimensionar(w, h) {
      camara.aspect = w / Math.max(1, h);
      // En vertical el encuadre se estrecha tanto que la placa se sale por los
      // lados. Abrir el campo lo compensa.
      camara.fov = camara.aspect < 1 ? 54 : 38;
      camara.updateProjectionMatrix();
    },
  };
}
