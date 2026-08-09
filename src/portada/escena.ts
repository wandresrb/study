// Contrato común de las escenas de la portada.
//
// Una escena no sabe nada del scroll: recibe un avance de 0 a 1 y se dibuja.
// Quien decide cuándo montarla y cuándo soltarla es la página.

export interface Escena {
  /** Avance de la capa, ya cuantizado, de 0 a 1. */
  avance(p: number): void;
  /** Libera lienzos, contextos y recursos de GPU. */
  destruir(): void;
}

/** Toda escena expone esto como export nombrado `montar`. */
export type Montar = (host: HTMLElement) => Escena | Promise<Escena>;

/** Lienzo a resolución de dispositivo, que se remide solo. */
export function lienzo(host: HTMLElement): {
  canvas: HTMLCanvasElement;
  medir(): { w: number; h: number; dpr: number };
  soltar(): void;
} {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(canvas);

  // El tope de 2 en el dpr es deliberado: en pantallas a 3x el coste se
  // triplica y la diferencia no se ve. Es la misma decisión que toma cualquier
  // motor de juego.
  const medir = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h, dpr };
  };

  const obs = new ResizeObserver(() => medir());
  obs.observe(host);
  medir();

  return {
    canvas,
    medir,
    soltar() {
      obs.disconnect();
      canvas.remove();
    },
  };
}

/** Interpolación entre colores en formato [r,g,b] de 0 a 255. */
export function mezcla(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/** Catppuccin Mocha, los que usa la portada. */
export const PAL = {
  crust: [17, 17, 27],
  base: [30, 30, 46],
  surface1: [69, 71, 90],
  overlay0: [108, 112, 134],
  mauve: [203, 166, 247],
  blue: [137, 180, 250],
  teal: [148, 226, 213],
  green: [166, 227, 161],
  peach: [250, 179, 135],
  red: [243, 139, 168],
  lavender: [180, 190, 254],
  yellow: [249, 226, 175],
} as const;
