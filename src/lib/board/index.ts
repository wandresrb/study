import gsap from 'gsap';

import { END, type Scene } from '../scene';
import { build } from './board';
import { engine } from './render';
import { rig } from './rig';

const REST = 0.72;

const SINK = [END, 0.94] as const;

const smooth = (t: number) => t * t * (3 - 2 * t);
const band = (p: number, a: number, b: number) =>
  smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface BoardScene extends Scene {
  start(): void;
  reset(): void;
}

export async function mount(host: HTMLElement): Promise<BoardScene> {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forceGL = new URLSearchParams(window.location.search).has('gl');

  const r = rig();
  const m = await engine(host, forceGL, (w, h) => r.resize(w, h));
  const board = build(m.renderer);

  host.dataset.backend = m.backend;

  const state = { p: reduced ? REST : 0, intro: reduced ? 1 : 0 };
  const startTime = performance.now();

  let frames = 0;
  let failed = false;
  let started = reduced;

  const compose = (t: number) => {
    try {
      const camera = Math.min(1, state.p / END);
      const sunk = band(state.p, SINK[0], SINK[1]);

      const showMachine = started && sunk < 0.999;
      if (showMachine) {
        r.apply(camera, state.intro);
        board.compose(camera, sunk);
        board.animate(t, state.intro);
        m.renderer.render(board.scene, r.camera);
      } else {
        m.renderer.clear();
      }

      m.show();
      frames++;
      if (import.meta.env.DEV && frames % 30 === 1) host.dataset.frames = String(frames);
    } catch (err) {
      if (!failed) {
        failed = true;
        host.dataset.error = String((err as Error)?.message ?? err);
        console.error('[board] render loop cannot compose:', err);
      }
    }
  };

  let alive = true;
  let raf = 0;

  if (reduced) {
    compose(0);
  } else {
    const frame = () => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      compose((performance.now() - startTime) / 1000);
    };
    raf = requestAnimationFrame(frame);
  }

  return {
    reset() {
      started = false;
      gsap.killTweensOf(state);
      state.p = 0;
      state.intro = 0;
    },

    start() {
      if (started || !alive) return;
      started = true;
      gsap.to(state, { intro: 1, duration: 2.2, ease: 'power2.out' });
    },

    advance(p) {
      if (reduced || !alive) return;
      gsap.to(state, { p, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    },

    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(state);
      delete host.dataset.backend;
      delete host.dataset.frames;
      board.dispose();
      m.dispose();
    },
  };
}
