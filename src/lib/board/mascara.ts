import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three/webgpu';

import {
  azar,
  CABECERAS,
  fisico,
  LADO,
  MEDIO,
  PASO_PIN_CABECERA,
  PILA,
  ZONAS,
} from './layout';
import { enTaladro, taladros } from './agujeros';
import { HUELLAS, type Pieza } from './siembra';
import { abanicoCpu, buses, type Punto } from './trazas';

const N = 2048;
const PX = N / LADO;

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

const SUP = {
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

  capa(ctxs, [COLOR.mascara, SUP.mascara], (c) => c.fillRect(0, 0, N, N));

  capa(ctxs, [COLOR.plano, SUP.mascara], (c) => {
    for (let i = 0; i < 14; i++) {
      const x = (rnd() - 0.5) * LADO;
      const z = (rnd() - 0.5) * LADO;
      const w = (18 + rnd() * 70) * PX;
      const h = (18 + rnd() * 70) * PX;
      c.globalAlpha = 0.5 + rnd() * 0.5;
      c.fillRect(ax(x) - w / 2, az(z) - h / 2, w, h);
    }
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

  const abanico = abanicoCpu();
  capa(ctxs, [COLOR.pista, SUP.pista], (c) => {
    c.lineWidth = Math.max(1.2, 0.26 * PX);
    c.lineCap = 'round';
    for (let i = 0; i < abanico.pistas.length; i++) {
      const v = abanico.vias[i];
      if (enTaladro(v[0], v[1], 0.8)) continue;
      trazar(c, abanico.pistas[i]);
      vias.push([v[0], v[1]]);
    }
  });

  capa(ctxs, [COLOR.via, SUP.mascara], (c) => {
    for (const [x, z] of vias) {
      c.beginPath();
      c.arc(ax(x), az(z), 0.42 * PX, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 220; i++) {
      const x = (rnd() - 0.5) * LADO * 0.97;
      const z = (rnd() - 0.5) * LADO * 0.97;
      if (fisico(x, z, 0) || enTaladro(x, z, 0)) continue;
      c.beginPath();
      c.arc(ax(x), az(z), 0.38 * PX, 0, Math.PI * 2);
      c.fill();
    }
  });

  capa(ctxs, [COLOR.metal, SUP.metal], (c) => {
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
          corona(
            cab.x + i * PASO_PIN_CABECERA,
            cab.z + (hilera - 0.5) * PASO_PIN_CABECERA,
            0.85,
            i === 0 && hilera === 0,
          );
        }
      }
    }
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

  capa(ctxs, [COLOR.tinta, SUP.tinta], (c) => {
    c.lineWidth = Math.max(1, 0.22 * PX);

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

    c.globalAlpha = 0.85;
    c.font = `${Math.round(2.6 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.textBaseline = 'middle';
    for (const s of ZONAS) {
      if (!s.rotulo) continue;
      c.fillText(s.rotulo, ax(s.x) - (s.an * PX) / 2, az(s.z) - (s.pr * PX) / 2 - 4.4 * PX);
    }

    c.globalAlpha = 0.5;
    c.font = `${Math.round(1.9 * PX)}px ui-monospace, monospace`;
    const letras = ['R', 'C', 'U', 'L', 'Q', 'D'];
    for (let i = 0; i < 240; i++) {
      const x = (rnd() - 0.5) * LADO * 0.94;
      const z = (rnd() - 0.5) * LADO * 0.94;
      if (fisico(x, z, 3)) continue;
      c.fillText(`${letras[(rnd() * letras.length) | 0]}${(rnd() * 90 + 10) | 0}`, ax(x), az(z));
    }

    c.globalAlpha = 0.9;
    c.font = `600 ${Math.round(5.4 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.fillText('WANDRES.DEV  CS-244M', ax(-70), az(77));
    c.globalAlpha = 0.55;
    c.font = `${Math.round(2.8 * PX)}px ui-monospace, monospace`;
    c.fillText('REV 1.0', ax(-70), az(84));
    c.font = `${Math.round(2.6 * PX)}px ui-monospace, "JetBrains Mono", monospace`;
    c.fillText('BATTERY', ax(PILA.x - 6), az(PILA.z + PILA.r + 4));
  });

  capa(ctxs, [COLOR.desnudo, SUP.mascara], (c) => {
    for (const t of taladros()) {
      c.beginPath();
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
