// El motor. WebGPU cuando lo hay, WebGL2 cuando no, sin escribir nada dos
// veces: los materiales son nodos (TSL) y Three los compila a WGSL o a GLSL
// según el backend que acabe eligiendo.

import { NeutralToneMapping, PCFSoftShadowMap, WebGPURenderer } from 'three/webgpu';

import { PAL } from './placa';

export interface Motor {
  renderer: WebGPURenderer;
  /** Cuál acabó usándose. Útil para depurar y para el HUD de desarrollo. */
  backend: 'webgpu' | 'webgl';
  medir(): { w: number; h: number };
  /** El lienzo, para poder copiarlo antes de soltar la escena. */
  lienzo: HTMLCanvasElement;
  /** Descubre el lienzo. Se llama tras componer el primer fotograma. */
  mostrar(): void;
  soltar(): void;
}

export async function motor(
  host: HTMLElement,
  forzarGL = false,
  alRedimensionar?: (w: number, h: number) => void,
): Promise<Motor> {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .9s ease';
  host.appendChild(canvas);

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false,
    forceWebGL: forzarGL,
  });
  renderer.setClearColor(PAL.fondo, 1);
  // Neutral y no ACES: ACES tiene un pie muy marcado y sobre una placa —que es
  // oscura por definición— se come los medios enteros. Aquí lo que hay que
  // conservar es justo la franja media, donde vive toda la superficie.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  // Si no hay ni WebGPU ni WebGL2, esto lanza. Quien llama ya lo captura y
  // deja la sección con su texto, que es la degradación correcta.
  await renderer.init();

  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
    ? 'webgpu'
    : 'webgl';

  // El tope de 2 en el dpr es deliberado: a 3x el coste se triplica y la
  // diferencia no se ve. Misma decisión que en `escena.ts`.
  //
  // Solo se remide cuando el observador avisa. Medir en cada fotograma obliga
  // al navegador a recalcular el diseño 60 veces por segundo, que es justo el
  // tipo de tirón que esta portada no se puede permitir.
  let ancho = 0;
  let alto = 0;

  const medir = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === ancho && h === alto) return { w, h };
    ancho = w;
    alto = h;
    // 1.5 en vez de 2: con sombras encendidas, a 2 son trece megapíxeles por
    // cuadro y el hilo principal se queda sin aire durante el montaje.
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    alRedimensionar?.(w, h);
    return { w, h };
  };

  const obs = new ResizeObserver(() => medir());
  obs.observe(host);
  medir();

  // El lienzo entra con fundido: si aparece de golpe se nota el salto entre el
  // texto que ya estaba pintado y la escena.
  //
  // El descubrimiento va atado al primer fotograma COMPUESTO, no a un
  // `requestAnimationFrame` suelto. Con el rAF suelto bastaba que el navegador
  // lo estrangulara durante el montaje —pestaña de fondo, hilo principal
  // ocupado— para que el lienzo se quedara transparente para siempre: la escena
  // dibujando a pleno rendimiento detrás de un `opacity: 0`. Así solo aparece
  // cuando hay algo que enseñar, y aparece siempre.

  return {
    renderer,
    backend,
    medir,
    lienzo: canvas,

    mostrar() {
      if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
    },
    soltar() {
      obs.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };
}
