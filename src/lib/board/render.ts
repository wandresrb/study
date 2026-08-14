import { NeutralToneMapping, PCFSoftShadowMap, WebGPURenderer } from 'three/webgpu';

export interface Engine {
  renderer: WebGPURenderer;
  backend: 'webgpu' | 'webgl';
  measure(): { w: number; h: number };
  canvas: HTMLCanvasElement;
  show(): void;
  dispose(): void;
}

export async function engine(
  host: HTMLElement,
  forceGL = false,
  onResize?: (w: number, h: number) => void,
): Promise<Engine> {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .9s ease';
  host.appendChild(canvas);

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    forceWebGL: forceGL,
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

  let width = 0;
  let height = 0;

  const measure = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === width && h === height) return { w, h };
    width = w;
    height = h;
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    onResize?.(w, h);
    return { w, h };
  };

  const obs = new ResizeObserver(() => measure());
  obs.observe(host);
  measure();

  return {
    renderer,
    backend,
    measure,
    canvas,

    show() {
      if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
    },
    dispose() {
      obs.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };
}
