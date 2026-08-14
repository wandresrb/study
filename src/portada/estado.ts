import { createSignal } from 'solid-js';

export interface Capa {
  dir: string;
  nombre: string;
}

export type Fase = 'inicio' | 'corriendo' | 'saliendo';

const [fase, setFase] = createSignal<Fase>('inicio');
const [pila, setPila] = createSignal<Capa[]>([]);
const [plegada, setPlegada] = createSignal(false);
const [salida, setSalida] = createSignal<{ texto: string; clase: string }[]>([]);

export { fase, pila, plegada, salida };

function direccion(): string {
  const alto = 0x7ffc + Math.floor(Math.random() * 4);
  const bajo = Math.floor(Math.random() * 0xffffffff);
  return `0x${alto.toString(16)}${bajo.toString(16).padStart(8, '0')}`;
}

export function empujar(nombre: string) {
  setPila((p) => [...p, { dir: direccion(), nombre }]);
}

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
