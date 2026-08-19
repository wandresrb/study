import { BITS, HIGH, indexAt, levelAt, penBits, penTrace, SAMPLES, STEP, stepPen } from '../lib/probe-signal';

export interface ProbeRun {
  stop(): void;
}

interface Plot {
  x: number;
  y: number;
  w: number;
  h: number;
}

const plotOf = (svg: SVGSVGElement): Plot => {
  const [x, y, w, h] = (svg.dataset.plot ?? '0,0,100,100').split(',').map(Number);
  return { x, y, w, h };
};

/** The screen has edges: the overshoot rides them instead of leaving the frame. */
const yOf = (plot: Plot, value: number) =>
  Math.min(plot.y + plot.h + 4, Math.max(plot.y - 4, plot.y + plot.h * (1 - value / HIGH)));

const points = (plot: Plot, volts: readonly number[]) =>
  volts
    .map((v, i) => `${(plot.x + (plot.w * i) / (volts.length - 1)).toFixed(1)},${yOf(plot, v).toFixed(1)}`)
    .join(' ');

const paintBits = (row: SVGGElement, plot: Plot, bits: readonly number[]) => {
  const gap = plot.w / BITS.length;
  row.textContent = '';
  bits.forEach((bit, i) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('x', String(plot.x + gap * (i + 0.5)));
    el.setAttribute('y', String(plot.y + plot.h + 78));
    el.setAttribute('font-size', '22');
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('fill', 'currentColor');
    el.setAttribute('class', bit ? 'text-green' : 'text-subtext0');
    el.textContent = String(bit);
    row.append(el);
  });
};

/**
 * Drives the docked scope: one clock for the copper in the scene and for the
 * pen on the screen, so the curve is the byte you can see travelling.
 */
export function runProbe(panel: HTMLElement, onFrame: (t: number, lit: number) => void): ProbeRun {
  const svg = panel.querySelector('svg');
  const wave = panel.querySelector<SVGPolylineElement>('[data-probe-wave]');
  const bitsRow = panel.querySelector<SVGGElement>('[data-probe-bits]');
  if (!svg || !wave) return { stop() {} };

  const plot = plotOf(svg);
  const volts = penTrace(0);
  const pen = { v: volts[volts.length - 1], dv: 0 };

  let carry = 0;
  let last = indexAt(0);
  let seen = penBits(0);
  let raf = 0;
  let alive = true;

  const t0 = performance.now();
  let prev = t0;

  const frame = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);

    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    stepPen(pen, levelAt(t) * HIGH, dt);

    carry += dt;
    while (carry >= STEP) {
      carry -= STEP;
      volts.push(pen.v);
      if (volts.length > SAMPLES) volts.shift();
    }
    wave.setAttribute('points', points(plot, volts));

    const i = indexAt(t);
    if (i !== last) {
      last = i;
      seen = [...seen, levelAt(t)].slice(-BITS.length);
      if (bitsRow) paintBits(bitsRow, plot, seen);
    }

    onFrame(t, Math.min(1, t / 0.6));
  };

  raf = requestAnimationFrame(frame);

  return {
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      onFrame(0, 0);
    },
  };
}
