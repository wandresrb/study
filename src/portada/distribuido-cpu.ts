// Capa 06 — respaldo en lienzo 2D.
//
// La misma simulación que la versión de GPU, con menos nodos. Es lo que ve
// quien no tiene WebGPU, y es también la referencia contra la que se compara la
// otra: si las dos no cuentan lo mismo, una de las dos está mal.

import { lienzo, PAL, type Escena } from './escena';
import { aplicarFase, faseDe, FASES, generar, hayCorte, paso } from './distribuido-modelo';

const N = 700;
const K = 5;

const COLOR_VER = [PAL.surface1, PAL.blue, PAL.mauve, PAL.green];

export function montar(host: HTMLElement): Escena {
  const { canvas, medir, soltar } = lienzo(host);
  const ctx = canvas.getContext('2d', { alpha: true })!;
  const t = generar(N, K);

  let fase = -1;
  let corte = false;
  let sep = 0; // separación visual entre mitades, solo durante el corte
  let anterior = performance.now();
  let vivo = true;
  let rafId = 0;

  const cuadro = (ahora: number) => {
    if (!vivo) return;
    const dt = Math.min(0.05, (ahora - anterior) / 1000);
    anterior = ahora;

    paso(t, dt, corte);
    const objetivo = corte ? 0.075 : 0;
    sep += (objetivo - sep) * Math.min(1, dt * 3.5);
    dibujar();

    rafId = requestAnimationFrame(cuadro);
  };

  const dibujar = () => {
    const { w, h, dpr } = medir();
    ctx.clearRect(0, 0, w, h);

    const ancha = w > h * 1.25;
    const cx = ancha ? w * 0.63 : w * 0.5;
    const cy = ancha ? h * 0.5 : h * 0.6;
    const esc = ancha ? Math.min(h * 0.42, w * 0.26) : Math.min(h * 0.3, w * 0.42);

    const px = (i: number) => cx + (t.pos[i * 2] + (t.lado[i] ? sep : -sep)) * esc;
    const py = (i: number) => cy + t.pos[i * 2 + 1] * esc;

    // Aristas. Una sola figura para todas: 3500 trazos sueltos no caben en un
    // cuadro, uno compuesto sí.
    const rectas = new Path2D();
    const rotas = new Path2D();
    for (let i = 0; i < t.n; i++) {
      const xi = px(i);
      const yi = py(i);
      for (let e = 0; e < t.k; e++) {
        const j = t.nb[i * t.k + e];
        if (j < i) continue; // cada arista una vez
        const destino = corte && t.lado[i] !== t.lado[j] ? rotas : rectas;
        destino.moveTo(xi, yi);
        destino.lineTo(px(j), py(j));
      }
    }
    ctx.lineWidth = Math.max(1, dpr * 0.6);
    ctx.strokeStyle = 'rgba(69,71,90,0.42)';
    ctx.stroke(rectas);
    if (corte) {
      // Los enlaces que cruzan el corte siguen ahí; lo que ya no pasa son los
      // mensajes. Se dibujan rotos, no ausentes.
      ctx.save();
      ctx.setLineDash([2 * dpr, 5 * dpr]);
      ctx.strokeStyle = 'rgba(243,139,168,0.30)';
      ctx.stroke(rotas);
      ctx.restore();
    }

    // Mensajes en vuelo.
    ctx.fillStyle = 'rgba(249,226,175,0.95)';
    for (let i = 0; i < t.n; i++) {
      for (let e = 0; e < t.k; e++) {
        const o = i * t.k + e;
        const pr = t.prog[o];
        if (pr <= 0.001) continue;
        const j = t.nb[o];
        // El mensaje va del que sabe al que no: de j hacia i.
        const x = px(j) + (px(i) - px(j)) * pr;
        const y = py(j) + (py(i) - py(j)) * pr;
        ctx.fillRect(x - dpr, y - dpr, dpr * 2, dpr * 2);
      }
    }

    // Nodos.
    const r = Math.max(1.6, dpr * 1.9);
    const cuenta = [0, 0, 0, 0];
    for (let i = 0; i < t.n; i++) {
      const v = Math.min(3, t.ver[i]);
      cuenta[v]++;
      const c = COLOR_VER[v];
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.beginPath();
      ctx.arc(px(i), py(i), v === 0 ? r * 0.8 : r, 0, Math.PI * 2);
      ctx.fill();
    }

    hud(ctx, dpr, w, h, ancha, cuenta, fase);
  };

  rafId = requestAnimationFrame(cuadro);

  return {
    avance(p) {
      const f = faseDe(p);
      if (f !== fase) {
        fase = f;
        corte = hayCorte(f);
        aplicarFase(t, f);
      }
    },
    destruir() {
      vivo = false;
      cancelAnimationFrame(rafId);
      soltar();
    },
  };

  function hud(
    c: CanvasRenderingContext2D,
    dpr: number,
    w: number,
    h: number,
    ancha: boolean,
    cuenta: number[],
    f: number,
  ) {
    const fs = Math.round(11 * dpr);
    c.font = `${fs}px ui-monospace, "JetBrains Mono", monospace`;
    c.textBaseline = 'top';
    const x = ancha ? Math.round(w * 0.63 - Math.min(h * 0.42, w * 0.26)) : Math.round(w * 0.08);
    let y = Math.round(h - fs * 5.5);

    c.fillStyle = 'rgba(180,190,254,0.95)';
    c.fillText(FASES[Math.max(0, f)].nombre.toUpperCase(), x, y);
    y += fs * 1.9;

    // Cuántos nodos creen cada cosa. Durante la partición son dos cifras a la
    // vez, y esa es toda la lección.
    c.fillStyle = 'rgba(127,132,156,0.95)';
    c.fillText(`${t.n} nodos · ${t.n * t.k} enlaces`, x, y);
    y += fs * 1.6;

    let dx = x;
    for (let v = 1; v < 4; v++) {
      if (!cuenta[v]) continue;
      const col = COLOR_VER[v];
      c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      c.fillRect(dx, y + fs * 0.25, fs * 0.5, fs * 0.5);
      c.fillStyle = 'rgba(166,173,200,0.95)';
      const txt = `v${v} ${cuenta[v]}`;
      c.fillText(txt, dx + fs * 0.9, y);
      dx += c.measureText(txt).width + fs * 2.4;
    }
    if (cuenta[0]) {
      c.fillStyle = 'rgba(108,112,134,0.9)';
      c.fillText(`sin dato ${cuenta[0]}`, dx, y);
    }
  }
}
