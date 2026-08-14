import { For, Show } from 'solid-js';

import './editor.css';
import { SALIDA, TRAS_SALIDA } from '../../portada/programa';
import {
  empujar,
  escribir,
  fase,
  irA,
  limpiarSalida,
  plegada,
  plegarConsola,
  salida,
} from '../../portada/estado';

const PANEL = 'rounded-sm border border-overlay0 overflow-hidden';
const BARRA = 'm-0 border-b border-surface1 bg-crust px-3.5 py-2 font-mono';

export default function Console(props: { codigo: string }) {
  let relojes: number[] = [];

  const correr = () => {
    if (fase() !== 'inicio') return;
    limpiarSalida();

    for (const l of SALIDA) {
      relojes.push(window.setTimeout(() => escribir(l.texto, l.clase), l.t));
    }

    const ultimo = SALIDA[SALIDA.length - 1].t;
    relojes.push(
      window.setTimeout(() => {
        empujar('HARDWARE');
        plegarConsola(true);
        irA('corriendo');
        relojes = [];
      }, ultimo + TRAS_SALIDA),
    );
  };

  return (
    <div>
      {}
      <button
        type="button"
        aria-expanded={!plegada()}
        onClick={() => plegarConsola(!plegada())}
        class="flex cursor-pointer items-center gap-2 rounded-sm border border-overlay0 bg-mantle px-3 py-1.5 font-mono text-xs text-subtext0 transition-colors hover:text-text focus-visible:text-text"
      >
        <span
          aria-hidden="true"
          class="inline-block text-2xs transition-[rotate] duration-200"
          classList={{ '-rotate-90': plegada() }}
        >
          ▾
        </span>
        <span>main.rs</span>
      </button>

      <div class="mt-3 grid gap-3" classList={{ hidden: plegada() }}>
        <div class={`${PANEL} bg-mantle shadow-flotante`}>
          <p class={`${BARRA} flex items-center gap-1.5 text-xs text-subtext0`}>
            <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
            <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
            <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
            <b class="ml-2 font-normal">main.rs</b>
          </p>

          {}
          {}
          <div class="editor" innerHTML={props.codigo} />

          {}
          <p class="m-0 flex items-center gap-3 border-t border-surface1 bg-crust px-3.5 py-1.5 font-mono text-2xs text-overlay1">
            <b class="rounded-xs bg-blue px-2 py-0.5 font-semibold tracking-versalita text-crust">
              NORMAL
            </b>
            <span class="text-subtext0">main.rs</span>
            <i class="not-italic">rust · utf-8</i>
            <em class="ml-auto not-italic text-subtext0">6:5</em>
          </p>
        </div>

        <div class={`${PANEL} bg-crust`}>
          <p class={`${BARRA} flex items-baseline gap-2.5 text-2xs text-overlay1`}>
            <b class="font-medium text-subtext0">zsh</b> <span>~/maquina</span>
          </p>
          <pre
            aria-live="polite"
            class="m-0 min-h-[4.6rem] px-3.5 py-2.5 font-mono text-xs/relaxed whitespace-pre-wrap text-subtext0"
          >
            <For each={salida()}>
              {(l) => (
                <>
                  <span class={l.clase}>{l.texto}</span>
                  {'\n'}
                </>
              )}
            </For>
            {}
            <Show when={salida().length === 0}>
              <span class="text-overlay1">
                ${' '}
                <b class="inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-parpadeo bg-subtext0" />
              </span>
            </Show>
          </pre>
        </div>

        <button
          type="button"
          onClick={correr}
          disabled={fase() !== 'inicio'}
          class="inline-flex cursor-pointer items-center gap-2.5 justify-self-start rounded-full border border-green/55 bg-green/12 px-4 py-2.5 font-mono text-sm text-green transition-colors hover:not-disabled:bg-green/20 focus-visible:bg-green/20 disabled:cursor-default disabled:opacity-45"
        >
          <span aria-hidden="true" class="text-2xs">
            ▶
          </span>
          <span>Run</span>
          <kbd class="inline-grid min-w-5 place-items-center rounded border border-b-2 border-green/35 bg-mantle/80 px-1.5 py-px text-2xs text-green/70">
            ⏎
          </kbd>
        </button>
      </div>
    </div>
  );
}
