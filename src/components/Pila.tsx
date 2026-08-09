/**
 * La pila: a la vez el estado y la navegación.
 *
 * Dice qué capas has montado y en qué orden, así que convertirla en el control
 * es no inventar una segunda cosa que diga lo mismo. Y solo deja sacar el tope,
 * que es como se comporta una pila de verdad — la restricción es fiel y de paso
 * es lo que el sitio enseña.
 *
 * Va en DOM y no dibujada en el lienzo porque es un control: tiene que recibir
 * foco con Tab, anunciarse a un lector de pantalla y tener área de pulsación.
 * Una textura no hace ninguna de esas cosas.
 *
 * Estilado con Tailwind. Los colores salen del `@theme` de `global.css`, que a
 * su vez apunta a las variables de siempre: `bg-mantle` ES `var(--mantle)`, no
 * una copia que pueda desincronizarse.
 */

import { For, Show } from 'solid-js';

import { fase, irA, pila, sacar as sacarDeLaPila } from '../portada/estado';

/** Cuánto dura la salida. Debe casar con la transición del lienzo en la CSS. */
const SALIDA_MS = 620;

/**
 * El contorno de la ranura sale de `overlay0` y no de `surface0`, y está
 * medido: en Catppuccin oscuro los niveles de superficie contiguos dan 1.30:1
 * contra el fondo — invisibles. `overlay0` es el primero que llega al mínimo
 * de 3:1 que pide un elemento de interfaz.
 */
const RANURA = 'flex items-center gap-4 min-h-[4.4rem] px-4 py-3.5 rounded-sm font-mono';

export default function Pila() {
  const pop = () => {
    if (fase() !== 'corriendo') return;
    // No se saca en el acto: primero se pasa por `saliendo`, que es lo que deja
    // a la escena desvanecerse. Sin ese paso intermedio el `pop` era un corte.
    irA('saliendo');
    window.setTimeout(() => {
      sacarDeLaPila();
      irA('inicio');
    }, SALIDA_MS);
  };

  return (
    <nav aria-label="Pila de capas">
      <ol class="m-0 list-none p-0">
        {/* La ranura vacía se ve desde el primer fotograma: es lo que hace que
            el push cierre algo que llevabas viendo abierto. */}
        <Show when={pila().length === 0}>
          <li class={`${RANURA} border border-dashed border-overlay0`}>
            <span class="text-[0.76rem] text-overlay2">0x0000</span>
            <span class="ml-auto text-[0.78rem] text-overlay2">ranura libre</span>
          </li>
        </Show>

        <For each={pila()}>
          {(capa, i) => (
            <li class={`${RANURA} border border-solid border-overlay1 bg-mantle`}>
              <span class="text-[0.76rem] text-overlay2">{capa.dir}</span>
              <span class="text-[1.05rem] tracking-[0.18em] text-text">{capa.nombre}</span>
              {/* Solo el tope lleva `pop`. Una pila no deja sacar del medio. */}
              <Show when={i() === pila().length - 1}>
                <button
                  type="button"
                  onClick={pop}
                  class="ml-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-mauve/55 bg-mauve/12 px-2.5 py-1 font-mono text-[0.72rem] text-mauve transition-colors hover:bg-mauve/25 focus-visible:bg-mauve/25"
                >
                  <span aria-hidden="true">⏏</span> pop
                </button>
              </Show>
            </li>
          )}
        </For>
      </ol>

      {/* El suelo. No hay techo: una pila que crece no tiene tapa, y ahí es
          donde irá software. */}
      <div class="mt-2.5 h-px bg-overlay1" />
      <p class="mt-2 font-mono text-[0.72rem] text-mauve">
        <span aria-hidden="true">sp →</span> len <b class="font-semibold">{pila().length}</b> · cap 3
      </p>
    </nav>
  );
}
