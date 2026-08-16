// Keeps core.ts out of every page that has no editor. Same shape as
// lib/vim/drill-mount.ts, which already proved it against the vim engine.
import type { Editor, EditorOptions } from './core';

type Core = typeof import('./core');

let core: Promise<Core> | null = null;
const loadCore = () => (core ??= import('./core'));

const live = new WeakMap<HTMLElement, Editor>();

/** The editor of a mounted host, for whoever drives it (a runner, the dojo). */
export const editorOf = (host: HTMLElement): Editor | undefined => live.get(host);

async function mountOne(host: HTMLElement) {
  if (host.dataset.mounted) return;
  host.dataset.mounted = '1';

  const raw = host.querySelector('script[type="application/json"]')?.textContent;
  if (!raw) return;
  const opts = JSON.parse(raw) as EditorOptions;

  const slot = host.querySelector<HTMLElement>('[data-editor-slot]') ?? host;
  slot.textContent = ''; // drop the SSR fallback

  const { create } = await loadCore();
  live.set(host, await create(slot, opts));
  host.dispatchEvent(new CustomEvent('editor:ready', { bubbles: true }));
}

let observer: IntersectionObserver | null = null;

function mountPending() {
  const pending = document.querySelectorAll<HTMLElement>('[data-editor]:not([data-mounted])');
  if (!pending.length) return;

  // Geometry first: observers are suspended in hidden tabs and their first
  // callback is not immediate, so anything already near the viewport mounts now.
  const margin = 300;
  const rest: HTMLElement[] = [];
  for (const host of pending) {
    const r = host.getBoundingClientRect();
    if (r.top < innerHeight + margin && r.bottom > -margin) void mountOne(host);
    else rest.push(host);
  }
  if (!rest.length) return;

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        observer!.unobserve(e.target);
        void mountOne(e.target as HTMLElement);
      }
    },
    { rootMargin: `${margin}px` },
  );
  for (const host of rest) observer.observe(host);
}

if (document.readyState !== 'loading') mountPending();
else document.addEventListener('DOMContentLoaded', mountPending, { once: true });

document.addEventListener('astro:page-load', mountPending);

// The router swaps the document out; without this the views leak.
document.addEventListener('astro:before-swap', () => {
  for (const host of document.querySelectorAll<HTMLElement>('[data-editor][data-mounted]')) {
    live.get(host)?.destroy();
    live.delete(host);
  }
});

export { mountPending };
