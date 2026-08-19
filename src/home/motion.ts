// Lazy gsap singleton for the landing. The board's lazy chunk already ships
// gsap, so these imports dedupe to the same instance; only the plugin chunks
// are new payload.

type Gsap = (typeof import('gsap'))['gsap'];
type FlipClass = (typeof import('gsap/Flip'))['Flip'];

let core: Promise<Gsap> | null = null;
let flip: Promise<{ gsap: Gsap; Flip: FlipClass }> | null = null;
let scramble: Promise<Gsap> | null = null;

// A failed load is not cached: the next call retries instead of replaying the
// rejection for the rest of the session.
export function loadGsap(): Promise<Gsap> {
  core ??= import('gsap')
    .then((m) => m.gsap)
    .catch((err) => {
      core = null;
      throw err;
    });
  return core;
}

export function loadFlip(): Promise<{ gsap: Gsap; Flip: FlipClass }> {
  flip ??= Promise.all([loadGsap(), import('gsap/Flip')])
    .then(([gsap, m]) => {
      gsap.registerPlugin(m.Flip);
      return { gsap, Flip: m.Flip };
    })
    .catch((err) => {
      flip = null;
      throw err;
    });
  return flip;
}

export function loadScramble(): Promise<Gsap> {
  scramble ??= Promise.all([loadGsap(), import('gsap/ScrambleTextPlugin')])
    .then(([gsap, m]) => {
      gsap.registerPlugin(m.ScrambleTextPlugin);
      return gsap;
    })
    .catch((err) => {
      scramble = null;
      throw err;
    });
  return scramble;
}

const flights = new Set<HTMLElement>();

export function killFlights() {
  for (const el of flights) el.remove();
  flights.clear();
}

/**
 * Clones `source` at its current rect and flies the clone into `target`'s box.
 * The clone is captured synchronously, so callers may hide the source right
 * after calling. Never rejects: on any failure the flight simply doesn't fly.
 */
export async function flyToken(source: HTMLElement, target: HTMLElement, opts?: { duration?: number }): Promise<void> {
  const rect = source.getBoundingClientRect();
  if (rect.width === 0) return;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    position: 'fixed',
    margin: '0',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: '60',
    pointerEvents: 'none',
  });
  document.body.appendChild(clone);
  flights.add(clone);

  const done = () => {
    flights.delete(clone);
    clone.remove();
  };

  const duration = opts?.duration ?? 0.72;
  try {
    const { gsap, Flip } = await loadFlip();
    if (!flights.has(clone)) return;
    await new Promise<void>((resolve) => {
      // No `absolute`: it would re-parent the fixed clone into page coordinates
      // and the flight would play thousands of pixels above the viewport.
      Flip.fit(clone, target, {
        duration,
        ease: 'power3.inOut',
        scale: true,
        onComplete: () => {
          done();
          resolve();
        },
      });
      // A long line squashing into a small frame reads as a dissolve, not a smear.
      gsap.to(clone, { opacity: 0, duration: 0.22, delay: duration - 0.22 });
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[home] flight failed:', err);
    done();
  }
}

// Islands importing this module are also evaluated during SSR.
if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', killFlights);
}
