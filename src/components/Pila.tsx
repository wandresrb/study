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
 */

import { For, Show } from 'solid-js';

import { fase, irA, pila, sacar as sacarDeLaPila } from '../portada/estado';

/** Cuánto dura la salida. Debe casar con la transición del lienzo en la CSS. */
const SALIDA_MS = 620;

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
    <nav class="pila" aria-label="Pila de capas">
      <ol class="pila-items">
        {/* La ranura vacía se ve desde el primer fotograma: es lo que hace que
            el push cierre algo que llevabas viendo abierto. */}
        <Show when={pila().length === 0}>
          <li class="pila-item">
            <span class="pila-dir">0x0000</span>
            <span class="pila-libre">ranura libre</span>
          </li>
        </Show>

        <For each={pila()}>
          {(capa, i) => (
            <li class="pila-item" data-puesta>
              <span class="pila-dir">{capa.dir}</span>
              <span class="pila-nombre">{capa.nombre}</span>
              {/* Solo el tope lleva `pop`. Una pila no deja sacar del medio. */}
              <Show when={i() === pila().length - 1}>
                <button class="pila-pop" type="button" onClick={pop}>
                  <span aria-hidden="true">⏏</span> pop
                </button>
              </Show>
            </li>
          )}
        </For>
      </ol>

      {/* El suelo. No hay techo: una pila que crece no tiene tapa, y ahí es
          donde irá software. */}
      <div class="pila-base" />
      <p class="pila-sp">
        <span aria-hidden="true">sp →</span> len <b>{pila().length}</b> · cap 3
      </p>
    </nav>
  );
}
