// Wires the vim exercises of a page to their DOM. Light and always loaded; the
// engine (CM6 + vim, ~90 KB) only downloads when the first one comes into view.

import { byLesson, complete, get, lessonIdOf, markRead } from '../learner';
import { lazyMount } from '../editor/mount';
import type { ExerciseDef, VimExercise } from './engine';

type Engine = typeof import('./engine');

let engine: Promise<Engine> | null = null;
const loadEngine = () => (engine ??= import('./engine'));

async function setup(root: HTMLElement): Promise<VimExercise> {
  const api = await loadEngine();
  const def = JSON.parse(
    root.querySelector('script[type="application/json"]')!.textContent!,
  ) as ExerciseDef;

  const id = root.dataset.id!;
  const challenge = root.dataset.challenge ?? '';
  // The store holds every track, so the hash is only unique within its lesson.
  // Replayed out of context (the review page) the origin travels in data-*.
  const lesson = root.dataset.lesson ?? lessonIdOf(location.href);
  const itemId = root.dataset.itemId ?? `${lesson}#${id}`;

  const term = root.querySelector<HTMLElement>('[data-term]')!;
  term.querySelector('pre')?.remove(); // the SSR fallback: the editor replaces it
  const modeEl = root.querySelector<HTMLElement>('[data-mode]')!;
  const hudEl = root.querySelector<HTMLElement>('[data-hud]')!;
  const stateEl = root.querySelector<HTMLElement>('[data-state]')!;
  const hintEl = root.querySelector<HTMLElement>('[data-hint]');
  const whyEl = root.querySelector<HTMLElement>('[data-why]');

  let usedHint = false;

  const paintState = (mastery: number | undefined) => {
    stateEl.textContent = mastery === 2 ? '★' : mastery !== undefined ? '✓' : '○';
    stateEl.className =
      'font-mono text-sm ' +
      (mastery === 2 ? 'text-yellow' : mastery !== undefined ? 'text-green' : 'text-overlay0');
  };
  void get(itemId).then((r) => paintState(r?.mastery));

  const exercise = await api.mount(term, def, {
    onMode(mode) {
      modeEl.textContent = mode.toUpperCase();
      modeEl.dataset.value = mode.split(' ')[0];
    },
    onKey(key) {
      if (!key) {
        hudEl.replaceChildren();
        return;
      }
      const chip = document.createElement('kbd');
      chip.className =
        'rounded-xs border border-line bg-mantle px-1 font-mono text-2xs text-subtext1';
      chip.textContent = key;
      hudEl.append(chip);
      while (hudEl.childElementCount > 14) hudEl.firstElementChild!.remove();
    },
    onSolved({ keys }) {
      const withinBudget = def.budget !== undefined && keys <= def.budget;
      whyEl?.removeAttribute('hidden');
      root.dispatchEvent(new CustomEvent('exercise:solved', { bubbles: true }));
      celebrate(root, withinBudget);
      void (async () => {
        await complete(itemId, {
          kind: 'exercise',
          lesson,
          label: challenge,
          data: def,
          noHint: !usedHint,
          withinBudget,
        });
        paintState((await get(itemId))?.mastery);
        // practising marks the lesson: with every exercise on the page done,
        // the read tick follows
        const total = document.querySelectorAll('[data-vim-exercise]').length;
        const done = (await byLesson()).get(lesson)?.done ?? 0;
        if (total > 0 && done >= total) void markRead(lesson);
      })();
    },
  });

  // Reachable from the element: the review page and browser checks use it.
  (root as HTMLElement & { exercise?: VimExercise }).exercise = exercise;

  root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    exercise.reset();
    exercise.editor.focus();
  });
  root.querySelector('[data-action="hint"]')?.addEventListener('click', () => {
    usedHint = true;
    hintEl?.toggleAttribute('hidden');
  });
  root.querySelector('[data-action="solution"]')?.addEventListener('click', () => {
    usedHint = true;
    whyEl?.removeAttribute('hidden');
    void exercise.replay();
  });

  // The «click to practise» overlay: keeps the keyboard from stealing the scroll.
  const veil = root.querySelector<HTMLElement>('[data-veil]');
  veil?.addEventListener('click', () => {
    veil.remove();
    exercise.editor.focus();
  });

  return exercise;
}

/* A win deserves 200 ms of joy, not confetti. GSAP is already in the site (the
   home page uses it); it comes on demand so no lesson pays for it. */
async function celebrate(root: HTMLElement, star: boolean) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { gsap } = await import('gsap');
  gsap.fromTo(
    root.querySelector('[data-term]'),
    { boxShadow: `0 0 0 2px var(${star ? '--yellow' : '--green'})` },
    { boxShadow: '0 0 0 0px transparent', duration: 0.6, ease: 'power2.out' },
  );
  gsap.fromTo(
    root.querySelector('[data-state]'),
    { scale: 1.6 },
    { scale: 1, duration: 0.35, ease: 'back.out(3)' },
  );
}

/** Mounts what is still pending. Exported: the review page injects exercises. */
export const { mountPending } = lazyMount('[data-vim-exercise]', setup);
