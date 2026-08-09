/**
 * El editor, la terminal y el botón que arranca todo.
 *
 * El código llega YA RESALTADO desde el build: Shiki corre en Astro y esto solo
 * lo inserta. Resaltar en el navegador habría sido enviar un analizador entero
 * para colorear diez líneas que no cambian nunca.
 *
 * Estilado con Tailwind, salvo el interior del bloque de código: lo que Shiki
 * emite no lleva clases nuestras, así que el canal de numeración y la línea
 * activa se pintan con CSS de verdad desde `global.css`. Poner utilidades sobre
 * marcado que no controlas no se puede.
 */

import { For, Show } from 'solid-js';

import {
  empujar,
  escribir,
  fase,
  irA,
  limpiarSalida,
  plegada,
  plegarConsola,
  salida,
} from '../portada/estado';

/** Lo que escupe la terminal, con su retardo. */
const SALIDA = [
  { t: 0, texto: '$ cargo run', clase: 'text-text' },
  { t: 520, texto: '   Compiling maquina v0.1.0', clase: 'text-overlay1' },
  { t: 1180, texto: '    Finished dev [unoptimized] in 0.61s', clase: 'text-overlay1' },
  { t: 1500, texto: '     Running `target/debug/maquina`', clase: 'text-green' },
];
/** Cuánto se espera tras la última línea antes de soltar la máquina. */
const TRAS_SALIDA = 420;

/**
 * El borde es lo ÚNICO que separa un panel de la página: los rellenos de
 * Catppuccin contiguos dan 1.07:1 entre sí. `overlay0` es el primer tono que
 * llega al mínimo de 3:1 — `surface0` se quedaba en 1.40 y era invisible.
 */
const PANEL = 'rounded-sm border border-overlay0 overflow-hidden';
const BARRA = 'm-0 border-b border-surface1 bg-crust px-3.5 py-2 font-mono';

export default function Consola(props: { codigo: string }) {
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
        // El push ocurre AQUÍ, no al final del scroll. Lo dice el propio
        // programa: `maquina.push(...)` se ejecuta al correrlo, así que para
        // cuando se ve la placa la ranura ya tiene que estar ocupada.
        empujar('HARDWARE');
        plegarConsola(true);
        irA('corriendo');
        relojes = [];
      }, ultimo + TRAS_SALIDA),
    );
  };

  return (
    <div>
      {/* La consola se pliega tras arrancar, pero NO se va: la pestaña queda y
          se puede volver a abrir. Perder el camino de vuelta era el problema. */}
      <button
        type="button"
        aria-expanded={!plegada()}
        onClick={() => plegarConsola(!plegada())}
        class="flex cursor-pointer items-center gap-2 rounded-sm border border-overlay0 bg-mantle px-3 py-1.5 font-mono text-[0.74rem] text-subtext0 transition-colors hover:text-text focus-visible:text-text"
      >
        <span
          aria-hidden="true"
          class="inline-block text-[0.6rem] transition-[rotate] duration-200"
          classList={{ '-rotate-90': plegada() }}
        >
          ▾
        </span>
        <span>main.rs</span>
      </button>

      <div class="mt-3 grid gap-3" classList={{ hidden: plegada() }}>
        <div class={`${PANEL} bg-mantle shadow-[0_18px_50px_-24px_rgb(0_0_0/0.75)]`}>
          <p class={`${BARRA} flex items-center gap-1.5 text-[0.72rem] text-subtext0`}>
            <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
            <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
            <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
            <b class="ml-2 font-normal">main.rs</b>
          </p>

          {/* El marcado lo genera Shiki, así que sus estilos viven en
              `global.css` bajo `.editor`. */}
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <div class="editor" innerHTML={props.codigo} />

          {/* Statusline. En un sitio de Neovim esto no es decoración: es lo que
              hace que se lea como un editor. */}
          <p class="m-0 flex items-center gap-3 border-t border-surface1 bg-crust px-3.5 py-1.5 font-mono text-[0.68rem] text-overlay1">
            <b class="rounded-[3px] bg-blue px-2 py-0.5 font-semibold tracking-[0.08em] text-crust">
              NORMAL
            </b>
            <span class="text-subtext0">main.rs</span>
            <i class="not-italic">rust · utf-8</i>
            <em class="ml-auto not-italic text-subtext0">6:5</em>
          </p>
        </div>

        <div class={`${PANEL} bg-crust`}>
          <p class={`${BARRA} flex items-baseline gap-2.5 text-[0.66rem] text-overlay1`}>
            <b class="font-medium text-subtext0">zsh</b> <span>~/maquina</span>
          </p>
          <pre
            aria-live="polite"
            class="m-0 min-h-[4.6rem] px-3.5 py-2.5 font-mono text-[0.73rem]/[1.75] whitespace-pre-wrap text-subtext0"
          >
            <For each={salida()}>
              {(l) => (
                <>
                  <span class={l.clase}>{l.texto}</span>
                  {'\n'}
                </>
              )}
            </For>
            {/* El prompt está desde el primer momento: una caja vacía parece
                rota. Y se va en cuanto hay salida, porque ya lo trae la
                primera línea. */}
            <Show when={salida().length === 0}>
              <span class="text-overlay1">
                ${' '}
                <b class="inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-[parpadeo_1.1s_steps(1,end)_infinite] bg-subtext0" />
              </span>
            </Show>
          </pre>
        </div>

        <button
          type="button"
          onClick={correr}
          disabled={fase() !== 'inicio'}
          class="inline-flex cursor-pointer items-center gap-2.5 justify-self-start rounded-full border border-green/55 bg-green/12 px-4 py-2.5 font-mono text-[0.84rem] text-green transition-colors hover:not-disabled:bg-green/20 focus-visible:bg-green/20 disabled:cursor-default disabled:opacity-45"
        >
          <span aria-hidden="true" class="text-[0.7rem]">
            ▶
          </span>
          <span>Run</span>
          <kbd class="inline-grid min-w-5 place-items-center rounded border border-b-2 border-green/35 bg-mantle/80 px-1.5 py-px text-[0.7rem] text-green/70">
            ⏎
          </kbd>
        </button>
      </div>
    </div>
  );
}
