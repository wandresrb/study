// Capa 03 — memoria y algoritmos.
//
// Una rejilla de celdas de memoria con valores desordenados, y un algoritmo
// ordenándolas. El avance de la capa ES el avance del algoritmo: al bajar se
// ordena, al subir se desordena. No es una ilustración de un algoritmo; es un
// algoritmo ejecutándose de verdad sobre 16 384 celdas.
//
// El algoritmo es la ordenación bitónica, y no por capricho: sus comparaciones
// están fijadas de antemano, no dependen de los datos. Eso la hace determinista
// y por tanto reversible — que es exactamente lo que pide una escena gobernada
// por el scroll. Es además el algoritmo de ordenación que se usa en GPU.

import { lienzo, mezcla, PAL, type Escena } from './escena';

const LADO = 128;
const N = LADO * LADO; // 16 384
const LOG = Math.log2(N) | 0; // 14

/** Las pasadas de la red bitónica: (k, j) fijos, sin mirar los datos. */
const PASADAS: Array<[number, number]> = [];
for (let k = 2; k <= N; k <<= 1) {
  for (let j = k >> 1; j > 0; j >>= 1) PASADAS.push([k, j]);
}
const TOTAL = PASADAS.length; // 105

/** Valores iniciales: una permutación barajada, siempre la misma. */
function inicial(): Uint16Array {
  const v = new Uint16Array(N);
  for (let i = 0; i < N; i++) v[i] = i;
  // Generador congruencial propio: el barajado tiene que ser idéntico en cada
  // recomputación o la escena parpadearía al retroceder.
  let s = 0x2545f491;
  for (let i = N - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const r = s % (i + 1);
    const t = v[i];
    v[i] = v[r];
    v[r] = t;
  }
  return v;
}

/** Una pasada de la red sobre todo el array. Devuelve cuántas celdas movió. */
function pasada(v: Uint16Array, k: number, j: number, tocada: Uint8Array): void {
  for (let i = 0; i < N; i++) {
    const p = i ^ j;
    if (p <= i) continue;
    const asc = (i & k) === 0;
    const a = v[i];
    const b = v[p];
    if (asc ? a > b : a < b) {
      v[i] = b;
      v[p] = a;
      tocada[i] = 1;
      tocada[p] = 1;
    }
  }
}

export function montar(host: HTMLElement): Escena {
  const { canvas, medir, soltar } = lienzo(host);
  const ctx = canvas.getContext('2d', { alpha: true })!;

  // Lienzo interno de una celda por píxel. Se amplía sin suavizado: cada celda
  // es un bloque nítido, no un degradado. La computación es discreta.
  const celdas = document.createElement('canvas');
  celdas.width = LADO;
  celdas.height = LADO;
  const cctx = celdas.getContext('2d')!;
  const img = cctx.createImageData(LADO, LADO);

  let valores = inicial();
  let tocada = new Uint8Array(N);
  let hasta = 0; // pasadas ya aplicadas
  let ultimo = -1; // último avance dibujado

  const irA = (destino: number) => {
    if (destino === hasta) return;
    if (destino < hasta) {
      // Retroceder no se puede deshacer pasada a pasada: se recalcula desde el
      // principio. Como el barajado es determinista, sale idéntico.
      valores = inicial();
      hasta = 0;
    }
    // El borrado va DENTRO del bucle. Fuera —como estaba— las marcas de todas
    // las pasadas se acumulaban, y al saltar unas pocas quedaban marcadas las
    // 16 384 celdas: la rejilla se veía como un rectángulo naranja liso. Lo que
    // tiene que quedar marcado es solo lo que movió la última pasada.
    while (hasta < destino) {
      tocada.fill(0);
      const [k, j] = PASADAS[hasta];
      pasada(valores, k, j, tocada);
      hasta++;
    }
  };

  const pintarCeldas = () => {
    const d = img.data;
    for (let i = 0; i < N; i++) {
      const t = valores[i] / (N - 1);
      // Rampa de tres tramos. Al principio es ruido; al final, un degradado
      // continuo. La estructura emerge sola.
      const c =
        t < 0.5 ? mezcla(PAL.mauve, PAL.blue, t * 2) : mezcla(PAL.blue, PAL.teal, (t - 0.5) * 2);
      const o = i << 2;
      if (tocada[i]) {
        // Lo que acaba de moverse se marca. Se ve el frente de la pasada.
        d[o] = 250;
        d[o + 1] = 179;
        d[o + 2] = 135;
      } else {
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
      }
      d[o + 3] = 255;
    }
    cctx.putImageData(img, 0, 0);
  };

  const dibujar = () => {
    const { w, h, dpr } = medir();
    ctx.clearRect(0, 0, w, h);

    // La rejilla se coloca a la derecha en pantallas anchas, para no pelearse
    // con el texto; centrada cuando no cabe.
    const ancha = w > h * 1.25;
    const lado = Math.round(ancha ? Math.min(h * 0.66, w * 0.4) : Math.min(h * 0.45, w * 0.78));
    const x = Math.round(ancha ? w * 0.64 - lado / 2 : (w - lado) / 2);
    const y = Math.round(ancha ? (h - lado) / 2 : h * 0.62 - lado / 2);

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = ancha ? 1 : 0.5;
    ctx.drawImage(celdas, x, y, lado, lado);
    ctx.globalAlpha = 1;

    // Marco y lectura del estado. El pie es el propio algoritmo diciendo en qué
    // pasada va: no es adorno, es la traza.
    ctx.strokeStyle = 'rgba(69,71,90,0.9)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeRect(x + 0.5, y + 0.5, lado - 1, lado - 1);

    const [k, j] = PASADAS[Math.min(TOTAL - 1, Math.max(0, hasta - 1))];
    const fs = Math.round(11 * dpr);
    ctx.font = `${fs}px ui-monospace, "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(127,132,156,0.95)';
    ctx.textBaseline = 'top';
    ctx.fillText(`${N} celdas · pasada ${String(hasta).padStart(3, '0')}/${TOTAL}`, x, y + lado + fs);
    ctx.fillText(`k=${k}  j=${j}`, x, y + lado + fs * 2.6);
  };

  return {
    avance(p) {
      const destino = Math.round(p * TOTAL);
      if (destino !== ultimo) {
        ultimo = destino;
        irA(destino);
        pintarCeldas();
      }
      dibujar();
    },
    destruir() {
      soltar();
    },
  };
}
