import { createSignal } from 'solid-js';

export interface Layer {
  addr: string;
  name: string;
}

// Values travel as data-fase on <html>; theme.css variants match them. Do not translate.
export type Phase = 'inicio' | 'corriendo' | 'saliendo';

const [phase, setPhase] = createSignal<Phase>('inicio');
const [stack, setStack] = createSignal<Layer[]>([]);
const [collapsed, setCollapsed] = createSignal(false);
const [output, setOutput] = createSignal<{ text: string; cls: string }[]>([]);

export { phase, stack, collapsed, output };

function address(): string {
  const hi = 0x7ffc + Math.floor(Math.random() * 4);
  const lo = Math.floor(Math.random() * 0xffffffff);
  return `0x${hi.toString(16)}${lo.toString(16).padStart(8, '0')}`;
}

export function push(name: string) {
  setStack((p) => [...p, { addr: address(), name }]);
}

export function pop() {
  setStack((p) => p.slice(0, -1));
}

export function goTo(f: Phase) {
  setPhase(f);
}

export function collapseConsole(v: boolean) {
  setCollapsed(v);
}

export function write(text: string, cls: string) {
  setOutput((s) => [...s, { text, cls }]);
}

export function clearOutput() {
  setOutput([]);
}
