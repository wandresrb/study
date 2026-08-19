import type { Mount, Scene } from '../lib/scene';
import { armFigure, clearFigure, type FigurePlay } from './figures';
import { runGate } from './gate';
import { runProbe } from './probe';

const LOADERS: Record<string, () => Promise<{ mount: Mount }>> = {
  hardware: () => import('../lib/board'),
};

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t: number) => t * t * (3 - 2 * t);
const band = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll through the machine is not linear: the exploded view opens, the camera
 * comes down as the parts land, rests on the assembled board, and then dives to
 * the copper. The sticky canvas leaves with its block: nothing is yanked away.
 */
const STOPS: [number, number][] = [
  [0, 0],
  [0.36, 0.3],
  [0.64, 0.68],
  [0.9, 1],
  [1, 1],
];

function cameraAt(q: number): number {
  let i = 0;
  while (i < STOPS.length - 2 && q > STOPS[i + 1][0]) i++;
  const [q0, c0] = STOPS[i];
  const [q1, c1] = STOPS[i + 1];
  const k = smooth(clamp((q - q0) / (q1 - q0)));
  return c0 + (c1 - c0) * k;
}

let beats: HTMLElement[] = [];
let active = -1;
let block: HTMLElement | null = null;
let host: HTMLElement | null = null;
let scene: Scene | null = null;
let mounting = false;
let pending = false;
let graphReady = false;

const armedFigures = new Map<HTMLElement, () => Promise<FigurePlay | null>>();
let playing: { root: HTMLElement; play: FigurePlay | null } | null = null;

let nearWatcher: IntersectionObserver | null = null;
let activeWatcher: IntersectionObserver | null = null;
let sceneWatcher: IntersectionObserver | null = null;

/* ── chrome ───────────────────────────────────────────────────────────────── */

const q1 = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);

function paintChrome(i: number) {
  const beat = beats[i];
  if (!beat) return;

  const layer = q1('[data-chrome-layer]');
  if (layer) layer.textContent = beat.dataset.layerTitle ?? '';

  const index = q1('[data-chrome-index]');
  if (index) index.textContent = String(i).padStart(2, '0');

  const hint = q1('[data-chrome-hint]');
  if (hint) hint.textContent = beat.dataset.hint ?? 'baja para seguir bajando';

  for (const chips of document.querySelectorAll<HTMLElement>('[data-chips-for]')) {
    chips.hidden = chips.dataset.chipsFor !== beat.dataset.beat;
  }

  // The stack is the layers climbed so far — recomputed, never accumulated.
  const climbed: string[] = [];
  for (let k = 0; k <= i; k++) {
    const b = beats[k];
    if (b.dataset.pushes !== undefined && b.dataset.layer) climbed.push(b.dataset.layer);
  }
  const top = climbed[climbed.length - 1];
  for (const frame of document.querySelectorAll<HTMLElement>('[data-frame]')) {
    const id = frame.dataset.frame ?? '';
    frame.hidden = !climbed.includes(id);
    // Only the top of the stack can be popped — that is what a stack is.
    const pop = frame.querySelector<HTMLElement>('[data-pop]');
    if (pop) pop.hidden = id !== top;
  }
  const len = q1('[data-chrome-len]');
  if (len) len.textContent = String(climbed.length);

  const manifesto = q1('[data-chrome-manifesto]');
  const stack = q1('[data-chrome-stack]');
  if (manifesto) manifesto.hidden = climbed.length > 0;
  if (stack) stack.hidden = climbed.length === 0;

  for (const pins of document.querySelectorAll<HTMLElement>('[data-pins-for]')) {
    pins.hidden = pins.dataset.pinsFor !== beat.dataset.beat;
  }

  paintPanels(beat.dataset.beat ?? '');
}

/* ── the docked instruments ───────────────────────────────────────────────── */

let panelRun: { stop(): void; toggle?(input: string): void } | null = null;
let panelEl: HTMLElement | null = null;
/** How far the scroll has brought the magnified detail in, 0 to 1. */
let gateLit = 0;

function paintPanels(id: string) {
  let live: HTMLElement | null = null;
  for (const panel of document.querySelectorAll<HTMLElement>('[data-panel-for]')) {
    const mine = panel.dataset.panelFor === id;
    panel.hidden = !mine;
    if (mine) live = panel;
  }

  if (live === panelEl) return;
  panelRun?.stop();
  panelRun = null;
  panelEl = live;
  scene?.gate?.(0, 0, 0, 0);

  if (!live || reduced()) return;
  panelRun = live.querySelector('[data-gate-panel]')
    ? runGate(live, (t, a, b) => scene?.gate?.(t, a, b, gateLit))
    : runProbe(live, (t, lit) => scene?.probe?.(t, lit));
}

/* ── figures ──────────────────────────────────────────────────────────────── */

const figureOf = (beat: HTMLElement) => beat.querySelector<HTMLElement>('[data-fig]');

function arm(beat: HTMLElement) {
  if (reduced()) return;
  const root = figureOf(beat);
  if (!root || armedFigures.has(root)) return;
  armedFigures.set(root, armFigure(root));
}

function disarm(beat: HTMLElement) {
  const root = figureOf(beat);
  if (!root) return;
  if (playing?.root === root) {
    playing.play?.kill();
    playing = null;
  }
  // Armed means hidden: leaving without playing must hand the figure back whole.
  if (armedFigures.delete(root)) clearFigure(root);
}

async function play(beat: HTMLElement) {
  const root = figureOf(beat);
  if (!root) return;

  if (root.dataset.kind === 'graph') {
    if (graphReady) return;
    graphReady = true;
    const mod = await import('./graph').catch(() => null);
    mod?.mountGraph(root);
    return;
  }

  if (reduced()) return;
  // A jump can land on a beat the near-watcher never armed: arm it now.
  const start = armedFigures.get(root) ?? armFigure(root);
  armedFigures.set(root, start);

  if (playing && playing.root !== root) playing.play?.kill();
  if (playing?.root === root) return;

  playing = { root, play: null };
  const handle = await start();
  if (playing?.root === root) playing.play = handle;
}

function replay(beat: HTMLElement) {
  const root = figureOf(beat);
  if (!root || reduced()) return;
  playing?.play?.kill();
  playing = null;
  armedFigures.set(root, armFigure(root));
  void play(beat);
}

/* ── the machine ──────────────────────────────────────────────────────────── */

const measure = () => {
  pending = false;
  if (!block || !scene) return;
  const r = block.getBoundingClientRect();
  const travel = r.height - window.innerHeight;
  const q = travel > 0 ? clamp(-r.top / travel) : r.top <= 0 ? 1 : 0;

  scene.advance(cameraAt(q));
  scene.explode?.(1 - band(q, 0.04, 0.22));
  scene.open?.(band(q, 0.7, 0.85));
  // The magnified pair belongs to the scroll, not to the panel's clock: it
  // must not be hanging there while the camera is still on its way.
  gateLit = band(q, 0.85, 0.94);
};

const onScroll = () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(measure);
};

function watchScene() {
  sceneWatcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const loader = LOADERS[el.dataset.scene ?? ''];
        if (!loader) continue;

        if (entry.isIntersecting) {
          if (scene || mounting) continue;
          mounting = true;
          loader()
            .then((m) => m.mount(el))
            .then((s) => {
              if (!mounting) {
                s.destroy();
                return;
              }
              scene = s;
              s.start?.();
              el.style.opacity = '1';
              if (reduced()) s.explode?.(0);
              measure();
            })
            .catch((err) => {
              if (import.meta.env.DEV) console.warn('[journey] the machine did not mount:', err);
            })
            .finally(() => {
              mounting = false;
            });
        } else {
          mounting = false;
          scene?.destroy();
          scene = null;
          el.style.removeProperty('opacity');
        }
      }
    },
    { rootMargin: '60% 0px 60% 0px' },
  );
  if (host) sceneWatcher.observe(host);
}

/* ── navigation ───────────────────────────────────────────────────────────── */

function goTo(i: number) {
  const target = beats[Math.max(0, Math.min(beats.length - 1, i))];
  if (!target) return;
  target.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
}

let lastG = -1e9;
let typed = '';

const onKeydown = (e: KeyboardEvent) => {
  if (!beats.length) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const beat = beats[active];

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
    case 'PageDown':
      e.preventDefault();
      goTo(active + 1);
      return;
    case 'k':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault();
      goTo(active - 1);
      return;
    case 'g':
      e.preventDefault();
      if (performance.now() - lastG < 500) goTo(0);
      lastG = performance.now();
      return;
    case 'G':
    case 'End':
      e.preventDefault();
      goTo(beats.length - 1);
      return;
    case 'Home':
      e.preventDefault();
      goTo(0);
      return;
    case 'Enter':
      if (active === 0) {
        e.preventDefault();
        goTo(1);
      }
      return;
  }

  if (!beat) return;

  // The gate station takes its two inputs from the keyboard too.
  if (beat.dataset.beat === 'puerta' && (e.key === 'a' || e.key === 'b')) {
    e.preventDefault();
    panelRun?.toggle?.(e.key);
    return;
  }

  // The two drills that listen to the keyboard.
  if (beat.dataset.beat === 'interrupciones' && e.key.length === 1) {
    replay(beat);
    return;
  }
  if (beat.dataset.beat === 'shell' && e.key.length === 1) {
    typed = (typed + e.key).slice(-2);
    if (typed === 'ls') {
      typed = '';
      replay(beat);
    }
  }
};

/** Pop unwinds a layer: back to the last station before it was pushed. */
const onPopClick = (e: Event) => {
  const button = (e.target as HTMLElement).closest<HTMLElement>('[data-pop]');
  if (!button) return;
  const layer = button.dataset.pop;
  const pushedAt = beats.findIndex((b) => b.dataset.layer === layer && b.dataset.pushes !== undefined);
  if (pushedAt > 0) goTo(pushedAt - 1);
};

/* ── lifecycle ────────────────────────────────────────────────────────────── */

function watchBeats() {
  nearWatcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const beat = entry.target as HTMLElement;
        if (entry.isIntersecting) arm(beat);
        else disarm(beat);
      }
    },
    { rootMargin: '45% 0px 45% 0px' },
  );

  activeWatcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const i = Number((entry.target as HTMLElement).dataset.index);
        if (i === active) continue;
        active = i;
        paintChrome(i);
        void play(beats[i]);
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );

  for (const beat of beats) {
    nearWatcher.observe(beat);
    activeWatcher.observe(beat);
  }
}

const teardown = () => {
  nearWatcher?.disconnect();
  activeWatcher?.disconnect();
  sceneWatcher?.disconnect();
  nearWatcher = activeWatcher = sceneWatcher = null;
  playing?.play?.kill();
  playing = null;
  panelRun?.stop();
  panelRun = null;
  panelEl = null;
  armedFigures.clear();
  mounting = false;
  scene?.destroy();
  scene = null;
  beats = [];
  active = -1;
  graphReady = false;
};

document.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
document.addEventListener('keydown', onKeydown);
document.addEventListener('click', onPopClick);
document.addEventListener('astro:before-swap', teardown);

document.addEventListener('astro:page-load', () => {
  teardown();
  const journey = document.querySelector('[data-journey]');
  if (!journey) return;

  beats = Array.from(document.querySelectorAll<HTMLElement>('[data-beat]'));
  block = document.querySelector<HTMLElement>('[data-board-block]');
  host = block?.querySelector<HTMLElement>('[data-scene]') ?? null;
  if (!beats.length) return;

  paintChrome(0);
  active = 0;
  watchBeats();
  watchScene();
  measure();
});
