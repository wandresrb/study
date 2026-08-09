// La superficie de la placa, dibujada en textura.
//
// Todo lo que en una placa es plano vive aquí: máscara de soldadura, planos de
// masa, los haces de pista, las vías, los pads al descubierto y la serigrafía.
// Es lo que decide que la escena parezca una placa, porque en una placa real lo
// que domina la vista es la máscara mate, no el cobre.
//
// Se generan dos mapas del mismo dibujo:
//   · color     — lo que se ve
//   · superficie — R = cuánto de metal, G = cuánto de rugoso
// Un solo muestreo en el material da los dos canales.

import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three/webgpu';

import {
  azar,
  CABECERAS,
  fisico,
  LADO,
  MEDIO,
  PASO_PIN_CABECERA,
  PILA,
  RADIO_TALADRO,
  ZONAS,
} from './layout';
import { enTaladro, taladros } from './agujeros';
import { HUELLAS, type Pieza } from './siembra';
import { buses, type Punto } from './trazas';

const N = 2048;
const PX = N / LADO; // píxeles por milímetro

const COLOR = {
  mascara: '#262838',
  plano: '#2f3146',
  pista: '#585d7d',
  potencia: '#6b7296',
  metal: '#e2e7f7',
  via: '#1b1c28',
  tinta: '#eef1fa',
  desnudo: '#3c3a44',
  soldadura: '#c9cee2',
  tintaTenue: '#6f748c',
};

// R = metálico, G = rugoso. El azul no se usa.
const SUP = {
  // G = rugosidad. 216 es 0.85: un lóbulo especular ancho responde mucho menos
  // al ángulo de cámara que uno estrecho, y eso es la mitad de la estabilidad
  // de la exposición durante el recorrido.
  mascara: 'rgb(10,216,0)',
  pista: 'rgb(12,158,0)',
  metal: 'rgb(242,58,0)',
  tinta: 'rgb(0,246,0)',
};

const ax = (x: number) => (x + MEDIO) * PX;
const az = (z: number) => (z + MEDIO) * PX;

function trazar(c: CanvasRenderingContext2D, p: Punto[]) {
  c.beginPath();
  c.moveTo(ax(p[0][0]), az(p[0][1]));
  for (let i = 1; i < p.length; i++) c.lineTo(ax(p[i][0]), az(p[i][1]));
  c.stroke();
}

/** Dibuja el mismo trazo en los dos lienzos con sus respectivos colores. */
function capa(
  ctxs: [CanvasRenderingContext2D, CanvasRenderingContext2D],
  colores: [string, string],
  fn: (c: CanvasRenderingContext2D) => void,
) {
  for (let i = 0; i < 2; i++) {
    const c = ctxs[i];
    c.save();
    c.fillStyle = colores[i];
    c.strokeStyle = colores[i];
    fn(c);
    c.restore();
  }
}

function lienzo(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = N;
  cv.height = N;
  const c = cv.getContext('2d')!;
  return [cv, c];
}

export interface Mascara {
  color: CanvasTexture;
  superficie: CanvasTexture;
  soltar(): void;
}


export function mascara(anisotropia: number, piezas: readonly Pieza[]): Mascara {
  const [cvColor, ctxColor] = lienzo();
  const [cvSup, ctxSup] = lienzo();
  const ctxs: [CanvasRenderingContext2D, CanvasRenderingContext2D] = [ctxColor, ctxSup];
  const rnd = azar(0x0b0a4d17);

  // --- Máscara de soldadura -------------------------------------------------
  capa(ctxs, [COLOR.mascara, SUP.mascara], (c) => c.fillRect(0, 0, N, N));

  // --- Planos de masa -------------------------------------------------------
  // Regiones grandes de cobre bajo la máscara. No se ven como cobre: se ven
  // como un cambio de tono apenas perceptible, y son la mitad de la textura de
  // una placa real.
  capa(ctxs, [COLOR.plano, SUP.mascara], (c) => {
    for (let i = 0; i < 14; i++) {
      const x = (rnd() - 0.5) * LADO;
      const z = (rnd() - 0.5) * LADO;
      const w = (18 + rnd() * 70) * PX;
      const h = (18 + rnd() * 70) * PX;
      c.globalAlpha = 0.5 + rnd() * 0.5;
      c.fillRect(ax(x) - w / 2, az(z) - h / 2, w, h);
    }
    // Trama de rejilla: el vaciado en malla que llevan los planos grandes.
    c.globalAlpha = 0.35;
    c.lineWidth = 1;
    for (let i = 0; i < N; i += 7) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, N);
      c.moveTo(0, i);
      c.lineTo(N, i);
      c.stroke();
    }
  });

  // --- Los haces ------------------------------------------------------------
  const haces = buses();
  for (const h of haces) {
    const potencia = h.ancho > 1;
    capa(ctxs, [potencia ? COLOR.potencia : COLOR.pista, SUP.pista], (c) => {
      c.lineWidth = Math.max(1.4, h.ancho * PX);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (const p of h.pistas) trazar(c, p);
    });
  }

  // Conexión de cada pieza: del pad a una vía, un tramo corto en el eje del
  // componente. Antes esto eran caminatas aleatorias que salían de la nada y
  // morían en la nada — las pistas que no apuntaban a ningún sitio.
  const vias: [number, number][] = [];
  capa(ctxs, [COLOR.pista, SUP.pista], (c) => {
    c.lineWidth = Math.max(1.2, 0.28 * PX);
    c.lineCap = 'round';
    for (const pieza of piezas) {
      const f = HUELLAS[pieza.huella];
      const ex = pieza.giro === 1 ? 0 : 1;
      const ez = pieza.giro === 1 ? 1 : 0;
      for (const lado of [-1, 1]) {
        const px = pieza.x + ex * lado * (f.an / 2);
        const pz = pieza.z + ez * lado * (f.an / 2);
        const largo = 1.6 + pieza.t * 4;
        const qx = px + ex * lado * largo;
        const qz = pz + ez * lado * largo;
        if (fisico(qx, qz, 0)) continue;
        trazar(c, [
          [px, pz],
          [qx, qz],
        ]);
        vias.push([qx, qz]);
      }
    }
  });

  // --- Vías -----------------------------------------------------------------
  // Los agujeros metalizados. Son cientos, diminutos, y su presencia es una de
  // las señales más fuertes de que aquello es una placa.
  capa(ctxs, [COLOR.via, SUP.mascara], (c) => {
    // Las de cada pieza, al final de su pista.
    for (const [x, z] of vias) {
      c.beginPath();
      c.arc(ax(x), az(z), 0.42 * PX, 0, Math.PI * 2);
      c.fill();
    }
    // Y el cosido de los planos de masa, que sí va repartido: son vías que no
    // conectan señal, solo unen capas.
    for (let i = 0; i < 220; i++) {
      const x = (rnd() - 0.5) * LADO * 0.97;
      const z = (rnd() - 0.5) * LADO * 0.97;
      if (fisico(x, z, 0) || enTaladro(x, z, 0)) continue;
      c.beginPath();
      c.arc(ax(x), az(z), 0.38 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });

  // --- Pads al descubierto --------------------------------------------------
  // Lo único de la placa donde el metal se ve de verdad.
  capa(ctxs, [COLOR.metal, SUP.metal], (c) => {
    // Las hileras de contactos de cada ranura.
    for (const s of ZONAS) {
      if (s.tipo !== 'ranura') continue;
      const largo = s.pr > s.an;
      const n = largo ? Math.round(s.pr / 1.3) : Math.round(s.an / 1.3);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * (largo ? s.pr : s.an) * 0.94;
        const px = ax(largo ? s.x : s.x + t);
        const pz = az(largo ? s.z + t : s.z);
        c.fillRect(px - 0.3 * PX, pz - 0.3 * PX, 0.6 * PX, 0.6 * PX);
      }
    }
    // Un par de pads por pieza, exactamente bajo sus terminales. Antes eran
    // dos mil seiscientos rectángulos sembrados al azar sin nada encima: los
    // cuadraditos blancos que aparecían donde no tocaba.
    for (const pieza of piezas) {
      const f = HUELLAS[pieza.huella];
      const ex = pieza.giro === 1 ? 0 : 1;
      const ez = pieza.giro === 1 ? 1 : 0;
      const anchoPad = f.an * 0.32;
      const largoPad = f.pr * 1.15;
      for (const lado of [-1, 1]) {
        const px = pieza.x + ex * lado * (f.an / 2 - anchoPad / 2);
        const pz = pieza.z + ez * lado * (f.an / 2 - anchoPad / 2);
        const w = (ex ? anchoPad : largoPad) * PX;
        const h = (ex ? largoPad : anchoPad) * PX;
        c.fillRect(ax(px) - w / 2, az(pz) - h / 2, w, h);
      }
    }
  });

  // --- Puntos de soldadura --------------------------------------------------
  // Todo lo que atraviesa la placa deja su corona de estaño alrededor del
  // agujero. Es de lo que más se ve en el borde inferior de una placa real, y
  // es lo que faltaba: había pads de montaje superficial pero ni un pasante.
  capa(ctxs, [COLOR.soldadura, SUP.metal], (c) => {
    const corona = (x: number, z: number, r: number, cuadrado: boolean) => {
      if (cuadrado) c.fillRect(ax(x) - r * PX, az(z) - r * PX, r * 2 * PX, r * 2 * PX);
      else {
        c.beginPath();
        c.arc(ax(x), az(z), r * PX, 0, Math.PI * 2);
        c.fill();
      }
    };
    for (const cab of CABECERAS) {
      for (let hilera = 0; hilera < 2; hilera++) {
        for (let i = 0; i < cab.pines; i++) {
          // La patilla uno lleva pad cuadrado. Es la convención de siempre.
          corona(
            cab.x + i * PASO_PIN_CABECERA,
            cab.z + (hilera - 0.5) * PASO_PIN_CABECERA,
            0.85,
            i === 0 && hilera === 0,
          );
        }
      }
    }
    // Y las patillas de anclaje de cada ranura.
    for (const z of ZONAS) {
      if (z.tipo !== 'ranura') continue;
      const alLargo = z.pr > z.an;
      const largo = alLargo ? z.pr : z.an;
      for (const lado of [-1, 1]) {
        const t = (lado * (largo / 2 - 3));
        corona(z.x + (alLargo ? 0 : t), z.z + (alLargo ? t : 0), 1.1, false);
      }
    }
  });
  // El agujero de cada pasante.
  capa(ctxs, ['#0a0a10', SUP.mascara], (c) => {
    for (const cab of CABECERAS) {
      for (let hilera = 0; hilera < 2; hilera++) {
        for (let i = 0; i < cab.pines; i++) {
          c.beginPath();
          c.arc(
            ax(cab.x + i * PASO_PIN_CABECERA),
            az(cab.z + (hilera - 0.5) * PASO_PIN_CABECERA),
            0.4 * PX,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
      }
    }
  });

  // --- Serigrafía -----------------------------------------------------------
  capa(ctxs, [COLOR.tinta, SUP.tinta], (c) => {
    c.lineWidth = Math.max(1, 0.22 * PX);

    // Contorno de cada zona, con su marca de patilla 1.
    for (const s of ZONAS) {
      if (s.tipo === 'bloque') continue;
      const w = s.an * PX;
      const h = s.pr * PX;
      c.globalAlpha = 0.55;
      c.strokeRect(ax(s.x) - w / 2 - 2, az(s.z) - h / 2 - 2, w + 4, h + 4);
      c.globalAlpha = 0.75;
      c.beginPath();
      c.arc(ax(s.x) - w / 2 - 5, az(s.z) - h / 2 - 5, 1.1 * PX, 0, Math.PI * 2);
      c.fill();
    }

    // Rótulos de zona.
    c.globalAlpha = 0.85;
    c.font = `${Math.round(2.6 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.textBaseline = 'middle';
    for (const s of ZONAS) {
      if (!s.rotulo) continue;
      c.fillText(s.rotulo, ax(s.x) - (s.an * PX) / 2, az(s.z) - (s.pr * PX) / 2 - 4.4 * PX);
    }

    // Referencias sueltas: R, C, U, L. Son el ruido tipográfico de una placa.
    c.globalAlpha = 0.5;
    c.font = `${Math.round(1.9 * PX)}px ui-monospace, monospace`;
    const letras = ['R', 'C', 'U', 'L', 'Q', 'D'];
    for (let i = 0; i < 240; i++) {
      const x = (rnd() - 0.5) * LADO * 0.94;
      const z = (rnd() - 0.5) * LADO * 0.94;
      if (fisico(x, z, 3)) continue;
      c.fillText(`${letras[(rnd() * letras.length) | 0]}${(rnd() * 90 + 10) | 0}`, ax(x), az(z));
    }

    // El nombre de la placa, como en cualquier placa.
    c.globalAlpha = 0.9;
    c.font = `600 ${Math.round(5.4 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    // A la derecha de la pila: donde estaba, el botón se la comía entera.
    c.fillText('NIVEL DIOS  ND-244M', ax(-70), az(77));
    c.globalAlpha = 0.55;
    c.font = `${Math.round(2.8 * PX)}px ui-monospace, monospace`;
    c.fillText('REV 1.0', ax(-70), az(84));
    c.font = `${Math.round(2.6 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.fillText('BATTERY', ax(PILA.x - 6), az(PILA.z + PILA.r + 4));
  });

  // --- Taladros -------------------------------------------------------------
  // Zona desnuda: alrededor de un taladro no hay máscara ni serigrafía, porque
  // ahí apoya el tornillo contra el chasis.
  capa(ctxs, [COLOR.desnudo, SUP.mascara], (c) => {
    for (const t of taladros()) {
      c.beginPath();
      // La corona desnuda es bastante más estrecha que la reserva: la reserva
      // solo dice dónde no puede haber nada, no tiene que verse.
      c.arc(ax(t.x), az(t.z), 3.5 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });
  capa(ctxs, [COLOR.metal, SUP.metal], (c) => {
    for (const t of taladros()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 2.05 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });
  capa(ctxs, ['#05050a', SUP.mascara], (c) => {
    for (const t of taladros()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 1.15 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });
  // El aro fino de serigrafía que marca el límite de la corona desnuda.
  capa(ctxs, [COLOR.tinta, SUP.tinta], (c) => {
    c.globalAlpha = 0.4;
    c.lineWidth = Math.max(1, 0.22 * PX);
    for (const t of taladros()) {
      c.beginPath();
      c.arc(ax(t.x), az(t.z), 4.1 * PX, 0, Math.PI * 2);
      c.stroke();
    }
  });

  const color = new CanvasTexture(cvColor);
  color.colorSpace = SRGBColorSpace;
  const superficie = new CanvasTexture(cvSup);

  for (const t of [color, superficie]) {
    // A cámara rasante —que es donde acaba el recorrido— la anisotropía es lo
    // único que impide que los haces se conviertan en papilla.
    t.anisotropy = anisotropia;
    t.minFilter = LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
  }

  return {
    color,
    superficie,
    soltar() {
      color.dispose();
      superficie.dispose();
      cvColor.width = cvColor.height = 0;
      cvSup.width = cvSup.height = 0;
    },
  };
}
