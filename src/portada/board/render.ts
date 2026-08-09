// El motor. WebGPU cuando lo hay, WebGL2 cuando no, sin escribir nada dos
// veces: los materiales son nodos (TSL) y Three los compila a WGSL o a GLSL
// según el backend que acabe eligiendo.

import { NeutralToneMapping, PCFSoftShadowMap, WebGPURenderer } from 'three/webgpu';


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

  // LIENZO TRANSPARENTE, y es lo que quita el agujero negro de la portada.
  //
  // Antes era opaco y se limpiaba con su propio color, un degradado que iba de
  // #0e0e15 a #06060a. Eso se eligió cuando la placa llenaba el encuadre —un
  // entorno casi negro la hacía resaltar y disimulaba dónde acababa la escena—
  // pero medido contra la paleta del sitio era 3 veces más oscuro por abajo y
  // 7 por arriba. O sea: un agujero recortado sobre la página.
  //
  // Sin fondo propio hay UNA superficie en vez de dos, y se acabó la costura.
  // Los metales no se enteran: reflejan el `environment`, que es otra cosa.
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    forceWebGL: forzarGL,
  });
  renderer.setClearColor(0x000000, 0);
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
