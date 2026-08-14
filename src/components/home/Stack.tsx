import { For, Show } from 'solid-js';

import { phase, goTo, stack, pop as popStack } from '../../home/state';

const EXIT_MS = 620;

const SLOT = 'flex items-center gap-4 min-h-[4.4rem] px-4 py-3.5 rounded-sm font-mono';

export default function Stack() {
  const pop = () => {
    if (phase() !== 'corriendo') return;
    goTo('saliendo');
    window.setTimeout(() => {
      popStack();
      goTo('inicio');
    }, EXIT_MS);
  };

  return (
    <nav aria-label="Pila de capas">
      <ol class="m-0 list-none p-0">
        {}
        <Show when={stack().length === 0}>
          <li class={`${SLOT} border border-dashed border-overlay0`}>
            <span class="text-xs text-overlay2">0x0000</span>
            <span class="ml-auto text-sm text-overlay2">ranura libre</span>
          </li>
        </Show>

        <For each={stack()}>
          {(layer, i) => (
            <li class={`${SLOT} border border-solid border-overlay1 bg-mantle`}>
              <span class="text-xs text-overlay2">{layer.addr}</span>
              <span class="text-lg tracking-versalita text-text">{layer.name}</span>
              {}
              <Show when={i() === stack().length - 1}>
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
        <span aria-hidden="true">sp →</span> len <b class="font-semibold">{stack().length}</b> · cap 3
      </p>
    </nav>
  );
}
