/**
 * The byte on the wire. The engine paints it along the copper and the scope
 * draws it at the needle; both read this, so they cannot drift apart.
 * Kept free of three so the page can import it without the renderer.
 */
export const BITS = [0, 1, 1, 0, 1, 0, 0, 1] as const;

/** The pattern spans the probed lane exactly once. */
export const SPAN = BITS.length;
/** Bits per second along the lane. */
export const RATE = 1.35;
/** Where the needle touches, as a fraction of the lane. */
export const TIP = 0.46;

/** Volts a logic high sits at, and how much of the past the screen holds. */
export const HIGH = 1.2;
export const WINDOW = 6;
export const SAMPLES = 220;

/** The wire is not ideal: the edge overshoots and rings before it settles. */
const FREQ = 2 * Math.PI * 6.5;
const DAMPING = 0.52;

export interface Pen {
  v: number;
  dv: number;
}

/** One step of the pen towards the voltage the wire is holding. */
export function stepPen(pen: Pen, target: number, dt: number): void {
  pen.dv += (FREQ * FREQ * (target - pen.v) - 2 * DAMPING * FREQ * pen.dv) * dt;
  pen.v += pen.dv * dt;
}

/** Which bit of the stream is passing the needle at time `t`, in seconds. */
export function indexAt(t: number): number {
  return Math.floor(TIP * SPAN - t * RATE);
}

/** The value that bit carries. */
export function levelAt(t: number): number {
  const i = indexAt(t);
  return BITS[((i % BITS.length) + BITS.length) % BITS.length];
}

/** Seconds between two samples on the screen. */
export const STEP = WINDOW / RATE / SAMPLES;

/** A screenful of pen, ending at `endT`. The panel ships with one already drawn. */
export function penTrace(endT: number): number[] {
  const start = endT - WINDOW / RATE;
  const pen: Pen = { v: levelAt(start) * HIGH, dv: 0 };
  const out: number[] = [];
  for (let i = -SAMPLES; i < SAMPLES; i++) {
    const t = start + i * STEP;
    stepPen(pen, levelAt(t) * HIGH, STEP);
    if (i >= 0) out.push(pen.v);
  }
  return out;
}

/** The bits the screenful ending at `endT` has already latched, oldest first. */
export function penBits(endT: number): number[] {
  const out: number[] = [];
  for (let i = BITS.length - 1; i >= 0; i--) out.push(levelAt(endT - (i * 1) / RATE));
  return out;
}
