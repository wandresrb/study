/**
 * El editor, la terminal y el botón que arranca todo.
 *
 * El código llega YA RESALTADO desde el build: Shiki corre en Astro y esto solo
 * lo inserta. Resaltar en el navegador habría sido enviar un analizador entero
 * para colorear diez líneas que no cambian nunca.
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
  { t: 0, texto: '$ cargo run', clase: 'orden' },
  { t: 520, texto: '   Compiling maquina v0.1.0', clase: 'tenue' },
  { t: 1180, texto: '    Finished dev [unoptimized] in 0.61s', clase: 'tenue' },
  { t: 1500, texto: '     Running `target/debug/maquina`', clase: 'ok' },
];
/** Cuánto se espera tras la última línea antes de soltar la máquina. */
const TRAS_SALIDA = 420;

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
    <div class="consola" classList={{ plegada: plegada() }}>
      <button
        class="consola-pestana"
        type="button"
        aria-expanded={!plegada()}
        onClick={() => plegarConsola(!plegada())}
      >
        <span class="consola-flecha" aria-hidden="true">
          ▾
        </span>
        <span>main.rs</span>
      </button>

      <div class="consola-cuerpo">
        <div class="editor">
          <p class="editor-barra">
            <span class="editor-punto" aria-hidden="true" />
            <span class="editor-punto" aria-hidden="true" />
            <span class="editor-punto" aria-hidden="true" />
            <b>main.rs</b>
          </p>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <div class="editor-codigo" innerHTML={props.codigo} />
          {/* Statusline. En un sitio de Neovim esto no es decoración: es lo que
              hace que se lea como un editor. */}
          <p class="editor-estado">
            <b>NORMAL</b>
            <span>main.rs</span>
            <i>rust · utf-8</i>
            <em>6:5</em>
          </p>
        </div>

        <div class="terminal">
          <p class="terminal-barra">
            <b>zsh</b> <span>~/maquina</span>
          </p>
          <pre aria-live="polite">
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
              <span class="tenue">
                ${' '}
                <b class="cursor" />
              </span>
            </Show>
          </pre>
        </div>

        <button class="correr" type="button" onClick={correr} disabled={fase() !== 'inicio'}>
          <span class="correr-icono" aria-hidden="true">
            ▶
          </span>
          <span>Run</span>
          <kbd>⏎</kbd>
        </button>
      </div>
    </div>
  );
}
