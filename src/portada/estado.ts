// El estado de la portada.
//
// Una sola fuente de verdad para lo que antes eran trece `let` sueltos a nivel
// de módulo. Con un solo elemento en la pila aquello se sostenía; con tres
// capas, un `pop` por cada una y transiciones entre ellas, se convertía en el
// sitio donde se esconden los bugs. Ya pasó una vez: `arrancado` había que
// acordarse de tocarlo en tres funciones distintas.
//
// Aquí el estado se declara, y quien lo pinta se entera solo.

import { createSignal } from 'solid-js';

/** Un elemento de la pila. */
export interface Capa {
  /** Dirección donde quedó, para que se lea como memoria y no como una lista. */
  dir: string;
  nombre: string;
}

/**
 * En qué momento está la portada.
 *
 * `saliendo` existe para que el `pop` tenga transición: sin un estado
 * intermedio hay que quitar la escena y reponer la pantalla de inicio en el
 * mismo fotograma, y eso es exactamente el corte seco que había.
 */
export type Fase = 'inicio' | 'corriendo' | 'saliendo';

const [fase, setFase] = createSignal<Fase>('inicio');
const [pila, setPila] = createSignal<Capa[]>([]);
const [plegada, setPlegada] = createSignal(false);
const [salida, setSalida] = createSignal<{ texto: string; clase: string }[]>([]);

export { fase, pila, plegada, salida };

/**
 * Una dirección de pila plausible.
 *
 * `0x0000` no engaña a nadie: las pilas de verdad viven arriba del espacio de
 * direcciones. Este rango es el que usa Linux en x86-64, y cambia en cada
 * ejecución porque el propio sistema la aleatoriza.
 */
function direccion(): string {
  const alto = 0x7ffc + Math.floor(Math.random() * 4);
  const bajo = Math.floor(Math.random() * 0xffffffff);
  return `0x${alto.toString(16)}${bajo.toString(16).padStart(8, '0')}`;
}

export function empujar(nombre: string) {
  setPila((p) => [...p, { dir: direccion(), nombre }]);
}

/** Una pila solo deja sacar el tope. No es un «atrás» genérico. */
export function sacar() {
  setPila((p) => p.slice(0, -1));
}

export function irA(f: Fase) {
  setFase(f);
}

export function plegarConsola(v: boolean) {
  setPlegada(v);
}

export function escribir(texto: string, clase: string) {
  setSalida((s) => [...s, { texto, clase }]);
}

export function limpiarSalida() {
  setSalida([]);
}
