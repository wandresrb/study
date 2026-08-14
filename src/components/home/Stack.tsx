import { For, Show } from 'solid-js';

import { fase, irA, pila, sacar as sacarDeLaPila } from '../../portada/estado';

const SALIDA_MS = 620;

const RANURA = 'flex items-center gap-4 min-h-[4.4rem] px-4 py-3.5 rounded-sm font-mono';

export default function Stack() {
  const pop = () => {
    if (fase() !== 'corriendo') return;
    irA('saliendo');
    window.setTimeout(() => {
      sacarDeLaPila();
      irA('inicio');
    }, SALIDA_MS);
  };

  return (
    <nav aria-label="Pila de capas">
      <ol class="m-0 list-none p-0">
        {}
        <Show when={pila().length === 0}>
          <li class={`${RANURA} border border-dashed border-overlay0`}>
            <span class="text-xs text-overlay2">0x0000</span>
            <span class="ml-auto text-sm text-overlay2">ranura libre</span>
          </li>
        </Show>

        <For each={pila()}>
          {(capa, i) => (
            <li class={`${RANURA} border border-solid border-overlay1 bg-mantle`}>
              <span class="text-xs text-overlay2">{capa.dir}</span>
              <span class="text-lg tracking-versalita text-text">{capa.nombre}</span>
              {}
              <Show when={i() === pila().length - 1}>
                <button
                  type="button"
                  onClick={pop}
                  class="ml-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-mauve/55 bg-mauve/12 px-2.5 py-1 font-mono text-xs text-mauve transition-colors hover:bg-mauve/25 focus-visible:bg-mauve/25"
                >
                  <span aria-hidden="true">⏏</span> pop
                </button>
              </Show>
            </li>
          )}
        </For>
      </ol>

      {}
      <div class="mt-2.5 h-px bg-overlay1" />
      <p class="mt-2 font-mono text-xs text-mauve">
        <span aria-hidden="true">sp →</span> len <b class="font-semibold">{pila().length}</b> · cap 3
      </p>
    </nav>
  );
}
