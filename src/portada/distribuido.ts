// Capa 06 — selector.
//
// Se intenta WebGPU. Si el navegador no lo trae, si el adaptador no aparece o
// si algo revienta al construir las tuberías, se cae al lienzo 2D con menos
// nodos. La escena cuenta lo mismo en los dos casos; lo que cambia es la
// escala, y la escala es justo lo que la GPU aporta.

import type { Escena } from './escena';

export async function montar(host: HTMLElement): Promise<Escena> {
  try {
    const gpu = await import('./distribuido-gpu');
    return await gpu.montar(host);
  } catch (e) {
    if (import.meta.env.DEV) console.info('[portada] sin WebGPU, respaldo en lienzo:', e);
    // La versión de GPU puede haber dejado a medias un lienzo o el HUD.
    host.replaceChildren();
    const cpu = await import('./distribuido-cpu');
    return cpu.montar(host);
  }
}
