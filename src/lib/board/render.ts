import { NeutralToneMapping, PCFSoftShadowMap, WebGPURenderer } from 'three/webgpu';

export interface Motor {
  renderer: WebGPURenderer;
  backend: 'webgpu' | 'webgl';
  medir(): { w: number; h: number };
  lienzo: HTMLCanvasElement;
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
    alpha: true,
    forceWebGL: forzarGL,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  await renderer.init();

  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
    ? 'webgpu'
    : 'webgl';

  let ancho = 0;
  let alto = 0;

  const medir = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === ancho && h === alto) return { w, h };
    ancho = w;
    alto = h;
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    alRedimensionar?.(w, h);
    return { w, h };
  };

  const obs = new ResizeObserver(() => medir());
  obs.observe(host);
  medir();

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
