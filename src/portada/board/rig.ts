// El recorrido de cámara.
//
// Arranca casi cenital sobre la placa —que así SE LEE PLANA, sin necesidad de
// dibujar nada en dos dimensiones—, cabecea hasta enseñar que aquello es un
// objeto con volumen, y se abre hasta que cabe la mesa entera.
//
// Y ahí termina. El paso a 2D NO se hace aquí: cuando esta escena acaba, el
// lienzo se desvanece y la pila la dibujan HTML y CSS.
//
// Hubo un intento de conseguir el 2D con una cámara ortográfica y aplastando
// las mallas, y era un error de concepto: geometría iluminada sin perspectiva
// sigue siendo geometría. Quitarle la fuga a un objeto no lo convierte en un
// dibujo — solo lo deja raro.

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
  { p: 0.18, pos: [-52, 288, 232], mira: [0, 4, -12] },
  // Aparecen los bordes: ya es un objeto, no una superficie.
  { p: 0.34, pos: [14, 148, 288], mira: [0, 12, -54] },
  // Casi plana, que es donde mejor se lee el relieve: el escorzo alarga las
  // sombras y saca el filo de cada disipador.
  { p: 0.48, pos: [0, 76, 322], mira: [0, 40, -180] },
  // Se abre el encuadre y entra la mesa. La distancia no es negociable: la
  // esfera que envuelve monitor, teclado, ratón y placa tiene 542 mm de radio,
  // y para que quepa entera en un campo vertical de 38° hacen falta mil
  // seiscientos. Se puede parecer mucho, pero ya no hay niebla, así que
  // alejarse no apaga nada.
  { p: 0.62, pos: [0, 560, 1560], mira: [0, 210, -20] },
  // Baja un poco y se acerca: la máquina completa, de frente.
  { p: 0.82, pos: [0, 380, 1440], mira: [0, 170, -20] },
  // Y se queda quieta. Este último tramo es el relevo — el lienzo se está
  // desvaneciendo y la pila en HTML entra por encima, así que la cámara no
  // puede estar haciendo nada llamativo mientras tanto.
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

      // La llegada. Al cargar, la cámara está más lejos y se acerca. Se aleja
      // respecto al punto de mira, así el encuadre no cambia: solo la
      // distancia.
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
      // En vertical el encuadre se estrecha tanto que la placa se sale por los
      // lados. Abrir el campo lo compensa.
      camara.fov = aspecto < 1 ? 54 : 38;
      camara.updateProjectionMatrix();
    },
  };
}
