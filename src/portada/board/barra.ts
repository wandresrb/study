// La barra de la pila, dibujada DENTRO del lienzo pero en 2D de verdad.
//
// Es una pasada aparte: su propia escena, su propia cámara ortográfica en
// píxeles de pantalla, un plano y una textura pintada con el contexto 2D. Sin
// luz, sin sombra, sin perspectiva y sin profundidad — literalmente el mismo
// dibujo que haría un `<div>` con un borde y algo de texto, solo que compuesto
// por el mismo lienzo.
//
// Y ese es el punto. Antes esto era geometría 3D aplastada, que no engaña a
// nadie: un objeto iluminado sin fuga sigue siendo un objeto. Y luego fue un
// elemento de HTML por encima, que funcionaba pero obligaba a sincronizar dos
// cosas distintas y se notaba el relevo. Así hay una sola cosa que sincronizar:
// ninguna.

import {
  CanvasTexture,
  Mesh,
  MeshBasicNodeMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
} from 'three/webgpu';

/** Ancho máximo de la barra, en píxeles de CSS. */
const ANCHO_MAX = 830;
/** Alto de la barra. */
const ALTO = 76;
/** Cuánto la separa del borde inferior. */
const SUELO = 92;
/** Margen lateral cuando la ventana es más estrecha que `ANCHO_MAX`. */
const MARGEN = 24;

const COLOR = {
  borde: '#3b3f57',
  fondo: '#181926',
  num: '#7f849c',
  nombre: '#cdd6f4',
  detalle: '#6c7086',
  base: '#45475a',
};

const suave = (t: number) => t * t * (3 - 2 * t);
const franja = (p: number, a: number, b: number) =>
  suave(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface Barra {
  escena: Scene;
  camara: OrthographicCamera;
  redimensionar(w: number, h: number, dpr: number): void;
  aplicar(p: number): void;
  /** Si no hay nada que dibujar, la pasada se salta entera. */
  visible(): boolean;
  soltar(): void;
}

export function barra(): Barra {
  const escena = new Scene();
  const camara = new OrthographicCamera(-1, 1, 1, -1, -10, 10);

  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d')!;
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;

  const mat = new MeshBasicNodeMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const geo = new PlaneGeometry(1, 1);
  const malla = new Mesh(geo, mat);
  malla.frustumCulled = false;
  escena.add(malla);

  let ancho = 0;
  let alto = 0;
  let entrada = 0;

  /**
   * Repinta la textura. Se hace solo al redimensionar y no en cada fotograma:
   * el texto no cambia, y rasterizar tipografía sesenta veces por segundo para
   * dibujar siempre lo mismo es tirar el hilo principal.
   */
  const pintar = (w: number, dpr: number) => {
    const anchoCss = Math.min(ANCHO_MAX, w - MARGEN * 2);
    // La textura se pinta a resolución de dispositivo y el plano se dimensiona
    // en píxeles de CSS. Pintándola a tamaño de CSS, el borde de un píxel sale
    // borroso en cuanto hay más de un píxel físico por punto.
    cv.width = Math.max(2, Math.round(anchoCss * dpr));
    cv.height = Math.max(2, Math.round((ALTO + 14) * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, anchoCss, ALTO + 14);

    // El recuadro.
    ctx.fillStyle = COLOR.fondo;
    ctx.fillRect(0, 0, anchoCss, ALTO);
    ctx.strokeStyle = COLOR.borde;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, anchoCss - 1, ALTO - 1);

    // El texto.
    ctx.textBaseline = 'middle';
    const y = ALTO / 2;
    let x = 26;

    ctx.font = '500 15px ui-monospace, "JetBrains Mono", monospace';
    ctx.fillStyle = COLOR.num;
    ctx.fillText('01', x, y);
    x += 44;

    ctx.font = '500 22px ui-monospace, "JetBrains Mono", monospace';
    ctx.fillStyle = COLOR.nombre;
    ctx.letterSpacing = '4px';
    ctx.fillText('HARDWARE', x, y);
    ctx.letterSpacing = '0px';

    ctx.font = '13px ui-monospace, "JetBrains Mono", monospace';
    ctx.fillStyle = COLOR.detalle;
    const detalle = 'placa · monitor · teclado · ratón';
    ctx.fillText(detalle, anchoCss - 26 - ctx.measureText(detalle).width, y);

    // El suelo de la pila. No hay techo: una pila que crece no tiene tapa, y
    // ahí es donde irá software.
    ctx.strokeStyle = COLOR.base;
    ctx.beginPath();
    ctx.moveTo(0, ALTO + 10.5);
    ctx.lineTo(anchoCss, ALTO + 10.5);
    ctx.stroke();

    tex.needsUpdate = true;
    return anchoCss;
  };

  return {
    escena,
    camara,

    redimensionar(w, h, dpr) {
      ancho = w;
      alto = h;
      // La ortográfica en PÍXELES: así el tamaño de la barra no depende de la
      // distancia a nada y se comporta igual que un elemento de la página.
      camara.left = -w / 2;
      camara.right = w / 2;
      camara.top = h / 2;
      camara.bottom = -h / 2;
      camara.updateProjectionMatrix();

      const anchoCss = pintar(w, dpr);
      malla.scale.set(anchoCss, ALTO + 14, 1);
      malla.position.set(0, -h / 2 + SUELO + (ALTO + 14) / 2, 0);
    },

    aplicar(p) {
      // Entra justo donde la máquina termina de hundirse, y sube un poco al
      // asentar: eso es el push.
      entrada = franja(p, 0.86, 0.96);
      mat.opacity = entrada;
      malla.position.y = -alto / 2 + SUELO + (ALTO + 14) / 2 + (1 - entrada) * 34;
    },

    visible() {
      return entrada > 0.001 && ancho > 0;
    },

    soltar() {
      geo.dispose();
      mat.dispose();
      tex.dispose();
      cv.width = cv.height = 0;
      escena.clear();
    },
  };
}
