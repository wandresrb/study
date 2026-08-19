import { loadGsap, loadScramble } from './motion';

type Gsap = Awaited<ReturnType<typeof loadGsap>>;
type Timeline = ReturnType<Gsap['timeline']>;

const all = <T extends Element>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));

/** Hidden the moment the figure is armed, before gsap is even loaded. */
const hide = (els: Element[]) => {
  for (const el of els) (el as HTMLElement).style.opacity = '0';
};

/** A path ready to be drawn: dashed out to its own length. */
const coil = (paths: SVGPathElement[]) => {
  for (const p of paths) {
    const len = p.getTotalLength();
    if (!len) continue;
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
  }
};

/** Puts a figure back the way it is served: its finished state. */
export const clearFigure = (root: ParentNode) => {
  for (const el of all<HTMLElement>(root, '[style]')) {
    el.style.removeProperty('opacity');
    el.style.removeProperty('stroke-dasharray');
    el.style.removeProperty('stroke-dashoffset');
    el.style.removeProperty('transform');
    el.style.removeProperty('width');
  }
};

export interface FigurePlay {
  kill(): void;
}

/** Arms a figure synchronously; the returned promise resolves once it has played. */
export function armFigure(root: HTMLElement): () => Promise<FigurePlay | null> {
  const kind = root.dataset.kind ?? '';

  const nodes = all(root, '[data-node]');
  const edges = all<SVGPathElement>(root, '[data-edge], [data-draw]');
  const arrows = all(root, '[data-arrow]');
  const bars = all(root, '[data-bar]');
  const lines = all<HTMLElement>(root, '[data-line]');
  const morphLines = all(root, '[data-morph-line]');
  const captions = all(root, '[data-caption], [data-edge-label]');
  const cursor = root.querySelector<HTMLElement>('[data-log-cursor]');
  const chips = all(root, '[data-reveal-chip]');
  const frame = root.querySelector<HTMLElement>('[data-reveal-frame]');
  const windows = all(root, '[data-window]');
  const captures = all(root, '[data-capture]');
  const edgeTicks = all(root, '[data-edge-tick]');

  hide([...nodes, ...arrows, ...morphLines, ...captions, ...chips]);
  if (kind === 'log') hide([...lines, ...(cursor ? [cursor] : [])]);
  if (kind === 'bars') hide(bars);
  if (kind === 'timing') hide([...windows, ...captures, ...edgeTicks]);
  if (kind === 'hierarchy') hide(all(root, '[data-core], [data-l3], [data-dram] use'));
  if (kind === 'datapath') hide([...all(root, '[data-stage]'), ...all(root, '[data-field]')]);
  if (kind === 'reveal' && frame) hide([frame]);
  coil(edges);

  return async () => {
    const gsap = await loadGsap();
    const tl = gsap.timeline();

    // gsap warns on empty targets, and half the figures skip half the roles.
    const draw = (at?: string | number) =>
      edges.length ? tl.to(edges, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.08 }, at) : tl;
    const pop = (els: Element[], at?: string | number, stagger = 0.07) =>
      els.length ? tl.to(els, { opacity: 1, duration: 0.5, ease: 'power2.out', stagger }, at) : tl;

    switch (kind) {
      case 'flow': {
        pop(nodes, 0, 0.09);
        draw(0.25);
        pop(arrows, '-=0.4');
        pop(captions, '<');
        travel(root, gsap, tl);
        break;
      }
      case 'tree': {
        draw(0);
        pop(nodes, 0.1, 0.09);
        pop(captions, '-=0.2');
        break;
      }
      case 'bars': {
        if (bars.length) {
          tl.to(bars, { opacity: 1, duration: 0.45, stagger: 0.09, ease: 'power2.out' }).from(
            bars,
            { scaleX: 0, transformOrigin: '0% 50%', duration: 0.7, stagger: 0.09, ease: 'power3.out' },
            0,
          );
        }
        pop(captions, '-=0.3');
        break;
      }
      case 'cycle': {
        pop(nodes, 0, 0.11);
        draw(0.2);
        pop(arrows, '-=0.5');
        cycleSpin(root, gsap, tl);
        break;
      }
      case 'morph': {
        pop(nodes, 0, 0.16);
        pop(morphLines, 0.2, 0.028);
        pop(arrows, '-=0.5');
        break;
      }
      case 'log': {
        await bootLog(root, tl, lines, cursor);
        break;
      }
      case 'timing': {
        // The clock draws first, then the data, then what the edge captured.
        draw(0);
        pop(edgeTicks, 0.35, 0.05);
        pop(windows, 0.6, 0.05);
        pop(captures, 0.9, 0.08);
        pop(captions, '-=0.3');
        break;
      }
      case 'hierarchy': {
        pop(all(root, '[data-core], [data-l3], [data-dram] use'), 0, 0.06);
        pop(captions, '-=0.2');
        break;
      }
      case 'datapath': {
        // Stage by stage, the way the instruction actually moves.
        draw(0);
        pop(all(root, '[data-stage]'), 0.1, 0.22);
        pop(all(root, '[data-field]'), 0.35, 0.07);
        pop(all(root, '[data-mem-row="live"]'), 0.5);
        pop(captions, '-=0.2');
        break;
      }
      case 'reveal': {
        if (frame)
          tl.fromTo(frame, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' });
        pop(chips, '-=0.5', 0.05);
        break;
      }
      default:
        break;
    }

    return {
      kill() {
        tl.kill();
        gsap.killTweensOf(root.querySelectorAll('*'));
        clearFigure(root);
      },
    };
  };
}

/** The dot that walks the flow: sampled off the route, no extra plugin. */
function travel(root: HTMLElement, gsap: Gsap, tl: Timeline) {
  const path = root.querySelector<SVGPathElement>('[data-travel-path]');
  const dot = root.querySelector<SVGGElement>('[data-travel]');
  if (!path || !dot) return;

  const len = path.getTotalLength();
  if (!len) return;
  const head = { t: 0 };
  const place = () => {
    const p = path.getPointAtLength(head.t * len);
    gsap.set(dot, { x: p.x, y: p.y });
  };
  place();

  tl.to(dot, { opacity: 1, duration: 0.3 }, '-=0.2').to(
    head,
    {
      t: 1,
      duration: 2.6,
      ease: 'none',
      repeat: -1,
      repeatDelay: 0.9,
      onUpdate: place,
      onRepeat: () => {
        head.t = 0;
        place();
      },
    },
    '<',
  );
}

/** One step of the ring lights at a time, forever. */
function cycleSpin(root: HTMLElement, gsap: Gsap, tl: Timeline) {
  const steps = Array.from(root.querySelectorAll<SVGGElement>('[data-step] rect'));
  if (!steps.length) return;
  const spin = gsap.timeline({ repeat: -1 });
  for (const step of steps) {
    spin.to(step, { fillOpacity: 0.34, duration: 0.36, ease: 'power2.out' }).to(step, {
      fillOpacity: 0.1,
      duration: 0.36,
      ease: 'power2.in',
    });
  }
  tl.add(spin, '-=0.2');
}

/** The boot log: lines land in bursts and light their xray as they go. */
async function bootLog(root: HTMLElement, tl: Timeline, lines: HTMLElement[], cursor: HTMLElement | null) {
  const wantsScramble = lines.some((l) => l.dataset.scramble !== undefined);
  if (wantsScramble) await loadScramble();

  // Each target is lit by however many lines mention it: share the cells out
  // evenly so the last one always completes the row.
  const total = new Map<string, number>();
  for (const line of lines) {
    const id = line.dataset.lights;
    if (id) total.set(id, (total.get(id) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  let t = 0;

  for (const line of lines) {
    t += Number(line.dataset.gap ?? 0) / 1000;
    tl.set(line, { opacity: 1 }, t);
    if (line.dataset.scramble !== undefined && wantsScramble) {
      tl.to(line, { duration: 0.5, scrambleText: { text: line.textContent ?? '', chars: '!<>-_\\/[]{}=+*^?#' } }, t);
    }

    const target = line.dataset.lights;
    if (!target) continue;
    const xray = root.querySelector<HTMLElement>(`[data-xray="${target}"]`);
    if (!xray) continue;

    const times = total.get(target) ?? 1;
    const step = (seen.get(target) ?? 0) + 1;
    seen.set(target, step);

    const bar = xray.querySelector<HTMLElement>('[data-barfill]');
    if (bar) {
      tl.to(bar, { width: `${(step / times) * 100}%`, duration: 0.6, ease: 'power2.out' }, t);
      continue;
    }

    const cells = Array.from(xray.querySelectorAll<HTMLElement>('[data-cell]'));
    const upto = Math.round((step / times) * cells.length);
    const batch = cells.slice(Math.round(((step - 1) / times) * cells.length), upto);
    if (batch.length) {
      tl.to(batch, { opacity: 1, duration: 0.3, stagger: 0.07, ease: 'power2.out' }, t);
    }
  }

  if (cursor) tl.to(cursor, { opacity: 1, duration: 0.3 }, t + 0.3);
}
