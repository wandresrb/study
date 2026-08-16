import { createEffect, createRoot } from 'solid-js';

import type { Scene, Mount } from '../lib/scene';
import { push, phase, goTo, stack, collapseConsole } from './state';
import { MARKS, STEPS } from './script';
const watchPhase = () => {
  disposePhase?.();
  disposePhase = createRoot((dispose) => {
    createEffect(() => {
      const f = phase();
      // data-phase feeds the home:/booting: variants in theme.css; keep the name.
      document.documentElement.dataset.phase = f;
      const scn = host && mounted.get(host);

      if (f === 'running') {
        scn?.start?.();
      } else if (f === 'start') {
        scn?.reset?.();
        window.scrollTo({ top: 0, behavior: 'auto' });
        progress = -1;
        raw = -1;
        measure();
      }
    });
    return dispose;
  });
};

const LOADERS: Record<string, () => Promise<{ mount: Mount }>> = {
  hardware: () => import('../lib/board'),
};

let home: HTMLElement | null = null;
let layer: HTMLElement | null = null;
let host: HTMLElement | null = null;
let hint: HTMLElement | null = null;
let progress = -1;
let raw = -1;
let pending = false;
let active = -1;

const mounted = new Map<HTMLElement, Scene>();
const mounting = new Set<HTMLElement>();
let watcher: IntersectionObserver | null = null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let disposePhase: (() => void) | null = null;

const measure = () => {
  pending = false;
  if (!layer) return;
  const vh = window.innerHeight;
  const r = layer.getBoundingClientRect();
  const travel = r.height - vh;
  const gross = travel > 0 ? -r.top / travel : r.top <= 0 ? 1 : 0;
  const now = Math.min(1, Math.max(0, gross));

  const p = Math.round(now * STEPS) / STEPS;
  if (p !== progress) {
    progress = p;
    layer.style.setProperty('--p', String(p));
  }
  if (now !== raw) {
    raw = now;
    const scn = host && mounted.get(host);
    if (scn) scn.advance(now);
    if (hint) {
      if (now > 0.06) hint.dataset.far = '';
      else delete hint.dataset.far;
    }
  }

  let k = 0;
  for (let i = 0; i < MARKS.length; i++) if (now >= MARKS[i]) k = i;
  active = k;
};

const onScroll = () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(measure);
};

const goToMark = (k: number) => {
  if (!layer) return;
  const f = MARKS[Math.max(0, Math.min(MARKS.length - 1, k))];
  const top = layer.getBoundingClientRect().top + window.scrollY;
  const travel = Math.max(0, layer.offsetHeight - window.innerHeight);
  window.scrollTo({
    top: top + travel * f,
    behavior: reduced() ? 'auto' : 'smooth',
  });
};

let lastG = -1e9;

const onKeydown = (e: KeyboardEvent) => {
  if (!layer) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (phase() !== 'running') return;

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
    case 'PageDown':
      e.preventDefault();
      goToMark(active + 1);
      break;
    case 'k':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault();
      goToMark(active - 1);
      break;
    case 'g':
      e.preventDefault();
      if (performance.now() - lastG < 500) goToMark(0);
      lastG = performance.now();
      break;
    case 'G':
    case 'End':
      e.preventDefault();
      goToMark(MARKS.length - 1);
      break;
    case 'Home':
      e.preventDefault();
      goToMark(0);
      break;
  }
};

const destroyAll = () => {
  for (const scn of mounted.values()) scn.destroy();
  mounted.clear();
  mounting.clear();
  watcher?.disconnect();
  watcher = null;
};

const watch = () => {
  watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const loader = LOADERS[el.dataset.scene ?? ''];
        if (!loader) continue;

        if (entry.isIntersecting) {
          if (mounted.has(el) || mounting.has(el)) continue;
          mounting.add(el);
          loader()
            .then((m) => m.mount(el))
            .then((scn) => {
              if (!mounting.has(el)) {
                scn.destroy();
                return;
              }
              mounted.set(el, scn);
              scn.advance(raw < 0 ? 0 : raw);
            })
            .catch((err) => {
              if (import.meta.env.DEV) console.warn('[home] scene not mounted:', err);
            })
            .finally(() => mounting.delete(el));
        } else {
          mounting.delete(el);
          const scn = mounted.get(el);
          if (scn) {
            scn.destroy();
            mounted.delete(el);
          }
        }
      }
    },
    { rootMargin: '60% 0px 60% 0px' },
  );
  if (host) watcher.observe(host);
};

document.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
document.addEventListener('keydown', onKeydown);
document.addEventListener('astro:before-swap', destroyAll);

document.addEventListener('astro:before-swap', () => {
  disposePhase?.();
  disposePhase = null;
  delete document.documentElement.dataset.phase;
});

document.addEventListener('astro:page-load', () => {
  home = document.getElementById('home');
  layer = home?.querySelector<HTMLElement>('[data-layer]') ?? null;
  host = layer?.querySelector<HTMLElement>('[data-scene]') ?? null;
  hint = document.getElementById('keys');
  progress = -1;
  raw = -1;
  active = -1;
  if (!home) return;

  if (reduced() && stack().length === 0) {
    push('HARDWARE');
    collapseConsole(true);
    goTo('running');
  }
  watchPhase();
  measure();
  if (!reduced()) watch();
});
