import type { Tone } from './types';

/** Figures paint with `currentColor`; the tone picks the ink on the wrapper. */
export const TONE: Record<Tone, string> = {
  ink: 'text-text',
  muted: 'text-subtext0',
  mauve: 'text-mauve',
  blue: 'text-blue',
  green: 'text-green',
  peach: 'text-peach',
  red: 'text-red',
  teal: 'text-teal',
};

export const inkOf = (tone: Tone | undefined, fallback: Tone = 'muted') => TONE[tone ?? fallback];

/** The drawing surface every figure shares, so they read as one language. */
export const VIEW = { w: 1000, h: 560 } as const;

export const NODE = { w: 180, h: 64 } as const;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const boxOf = (n: { x: number; y: number; w?: number; h?: number }): Box => ({
  x: n.x,
  y: n.y,
  w: n.w ?? NODE.w,
  h: n.h ?? NODE.h,
});

export interface Link {
  d: string;
  mid: [number, number];
  /** Arrowhead: the tip and where it points, in degrees. */
  tip: [number, number];
  angle: number;
}

/**
 * A smooth connector between two boxes, leaving and entering by the faces that
 * face each other: sideways when the run is mostly horizontal, top/bottom when not.
 */
export function connect(a: Box, b: Box): Link {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;

  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  let c1: [number, number];
  let c2: [number, number];

  if (Math.abs(dx) >= Math.abs(dy)) {
    const right = dx >= 0;
    x1 = right ? a.x + a.w : a.x;
    y1 = ac.y;
    x2 = right ? b.x : b.x + b.w;
    y2 = bc.y;
    const bow = Math.max(24, Math.abs(x2 - x1) / 2);
    c1 = [x1 + (right ? bow : -bow), y1];
    c2 = [x2 - (right ? bow : -bow), y2];
  } else {
    const down = dy >= 0;
    x1 = ac.x;
    y1 = down ? a.y + a.h : a.y;
    x2 = bc.x;
    y2 = down ? b.y : b.y + b.h;
    const bow = Math.max(24, Math.abs(y2 - y1) / 2);
    c1 = [x1, y1 + (down ? bow : -bow)];
    c2 = [x2, y2 - (down ? bow : -bow)];
  }

  const angle = (Math.atan2(y2 - c2[1], x2 - c2[0]) * 180) / Math.PI;

  return {
    d: `M ${x1} ${y1} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}`,
    mid: [(x1 + x2) / 2, (y1 + y2) / 2],
    tip: [x2, y2],
    angle,
  };
}

/** The same connectors, chained: the traveller's route through the figure. */
export function route(boxes: Box[]): string {
  let d = '';
  for (let i = 0; i < boxes.length - 1; i++) {
    const seg = connect(boxes[i], boxes[i + 1]);
    d += i === 0 ? seg.d : ` ${seg.d.replace(/^M/, 'L')}`;
  }
  return d;
}
