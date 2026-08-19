export interface GateRun {
  stop(): void;
  toggle(input: string): void;
}

/** Off, on, and the colour a conducting path takes. */
const OFF = 'text-subtext0';
const LIVE = 'text-peach';
const HIGH = 'text-green';

/**
 * The gate station's state: two inputs the reader flips. It paints the panel
 * and hands the same state to the magnified transistor in the scene, so the
 * schematic and the silicon can never disagree.
 */
export function runGate(
  panel: HTMLElement,
  onFrame: (t: number, a: number, b: number) => void,
): GateRun {
  const inputs = { a: 1, b: 1 };

  const mos = (id: string) => panel.querySelector<SVGUseElement>(`[data-mos="${id}"]`);
  const wire = (id: string) => panel.querySelector<SVGGElement>(`[data-wire="${id}"]`);

  const tint = (el: Element | null, on: boolean, live = LIVE) => {
    if (el) el.setAttribute('class', on ? live : OFF);
  };

  const paint = () => {
    const { a, b } = inputs;
    const out = a && b ? 0 : 1;

    for (const key of ['a', 'b'] as const) {
      const val = panel.querySelector<HTMLElement>(`[data-gate-val="${key}"]`);
      if (val) {
        val.textContent = String(inputs[key]);
        val.className = `font-mono ${inputs[key] ? 'text-green' : 'text-subtext0'}`;
      }
      const button = panel.querySelector(`[data-gate-in="${key}"]`);
      button?.setAttribute('aria-pressed', String(Boolean(inputs[key])));
    }

    // A p-channel conducts with its gate low; an n-channel with it high.
    tint(mos('pa'), a === 0);
    tint(mos('pb'), b === 0);
    tint(mos('na'), a === 1);
    tint(mos('nb'), b === 1);

    // Only one of the two paths is ever complete: that is what decides S.
    tint(wire('vdd'), out === 1);
    tint(wire('up'), out === 1);
    tint(wire('down'), out === 0);
    tint(wire('gnd'), out === 0);
    tint(wire('out'), true, out ? HIGH : LIVE);

    const label = panel.querySelector<SVGTextElement>('[data-gate-out]');
    if (label) {
      label.textContent = String(out);
      label.setAttribute('class', out ? HIGH : OFF);
    }

    for (const row of panel.querySelectorAll<SVGGElement>('[data-row]')) {
      const mine = row.dataset.row === `${a}${b}`;
      row.querySelector('rect')?.setAttribute('fill-opacity', mine ? '0.16' : '0');
    }
  };

  let raf = 0;
  let alive = true;
  const t0 = performance.now();

  const frame = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    onFrame(t, inputs.a, inputs.b);
  };

  const onClick = (e: Event) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-gate-in]');
    const key = button?.dataset.gateIn;
    if (key === 'a' || key === 'b') {
      inputs[key] = inputs[key] ? 0 : 1;
      paint();
    }
  };

  panel.addEventListener('click', onClick);
  paint();
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      panel.removeEventListener('click', onClick);
    },

    toggle(input) {
      if (input !== 'a' && input !== 'b') return;
      inputs[input] = inputs[input] ? 0 : 1;
      paint();
    },
  };
}
