// Lazy mounting, shared by everything that puts a heavy widget in a lesson.
// Two rules it exists to enforce: a page pays nothing for a widget it does not
// have, and nothing survives a <ClientRouter/> swap.

type Teardown = { destroy(): void };

const MARGIN = 300;

/**
 * Mounts `[selector]` elements when they come near the viewport, once each.
 * Returns a function that mounts whatever is still pending — the review page
 * injects exercises after load and calls it.
 */
export function lazyMount(selector: string, setup: (host: HTMLElement) => Promise<Teardown | void>) {
  const live = new WeakMap<HTMLElement, Teardown>();
  let observer: IntersectionObserver | null = null;

  const mountOne = (host: HTMLElement) => {
    if (host.dataset.mounted) return;
    host.dataset.mounted = '1';
    void setup(host).then((instance) => {
      if (instance) live.set(host, instance);
    });
  };

  const mountPending = () => {
    const pending = document.querySelectorAll<HTMLElement>(`${selector}:not([data-mounted])`);
    if (!pending.length) return;

    // Geometry first: observers are suspended in hidden tabs and their first
    // callback is not immediate, so anything already near the viewport goes now.
    const far: HTMLElement[] = [];
    for (const host of pending) {
      const r = host.getBoundingClientRect();
      if (r.top < innerHeight + MARGIN && r.bottom > -MARGIN) mountOne(host);
      else far.push(host);
    }
    if (!far.length) return;

    observer ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          observer!.unobserve(e.target);
          mountOne(e.target as HTMLElement);
        }
      },
      { rootMargin: `${MARGIN}px` },
    );
    for (const host of far) observer.observe(host);
  };

  // The initial load cannot rely on astro:page-load alone: this module may be
  // evaluated after the event already fired.
  if (document.readyState !== 'loading') mountPending();
  else document.addEventListener('DOMContentLoaded', mountPending, { once: true });

  document.addEventListener('astro:page-load', mountPending);
  document.addEventListener('astro:before-swap', () => {
    for (const host of document.querySelectorAll<HTMLElement>(`${selector}[data-mounted]`)) {
      live.get(host)?.destroy();
      live.delete(host);
    }
  });

  return { mountPending, instanceOf: (host: HTMLElement) => live.get(host) };
}
