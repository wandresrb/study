// The page side of the JS runtime. Owns the worker's life: one per runner, torn
// down and rebuilt when a run has to be killed.
import type { RunEvent, Runtime, Test } from './types';

/** A runaway loop cannot be interrupted from inside; the worker is terminated. */
const TIMEOUT_MS = 5_000;

export function jsRuntime(): Runtime {
  let worker: Worker | null = null;
  let onEvent: ((e: RunEvent) => void) | null = null;

  const spawn = () => {
    const w = new Worker(new URL('./js-worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<RunEvent>) => onEvent?.(e.data);
    w.onerror = (e) => {
      onEvent?.({ k: 'err', text: e.message || 'el worker falló' });
      onEvent?.({ k: 'done', ms: 0 });
    };
    return w;
  };

  const kill = () => {
    worker?.terminate();
    worker = null;
  };

  return {
    async *run(code: string, tests: Test[] = []) {
      kill();
      worker = spawn();

      const queue: RunEvent[] = [];
      let wake: (() => void) | null = null;
      let finished = false;

      onEvent = (e) => {
        queue.push(e);
        if (e.k === 'done') finished = true;
        wake?.();
        wake = null;
      };

      const timer = setTimeout(() => {
        kill();
        onEvent?.({ k: 'err', text: `se detuvo a los ${TIMEOUT_MS / 1000} s: ¿un bucle sin salida?` });
        onEvent?.({ k: 'done', ms: TIMEOUT_MS });
      }, TIMEOUT_MS);

      worker.postMessage({ code, tests });

      try {
        while (true) {
          if (!queue.length) {
            if (finished) break;
            await new Promise<void>((r) => (wake = r));
            continue;
          }
          const event = queue.shift()!;
          yield event;
          if (event.k === 'done') break;
        }
      } finally {
        clearTimeout(timer);
        onEvent = null;
      }
    },

    stop: kill,
    destroy: kill,
  };
}
