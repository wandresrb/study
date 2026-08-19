import type { Layer } from './types';

/** The stack the journey builds, bottom-up. One frame per layer climbed. */
export const LAYERS: Layer[] = [
  { id: 'HARDWARE', title: 'la materia' },
  { id: 'FIRMWARE', title: 'el arranque' },
  { id: 'KERNEL', title: 'el núcleo' },
  { id: 'SYSCALL', title: 'la frontera' },
  { id: 'USERSPACE', title: 'los procesos' },
  { id: 'RED', title: 'la conexión' },
  { id: 'APP', title: 'la superficie' },
];

export const LAYER_COUNT = LAYERS.length;
