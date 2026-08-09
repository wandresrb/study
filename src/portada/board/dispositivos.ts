// Monitor, teclado y ratón. De verdad, no de mentira.
//
// Una placa sola no es hardware, es una pieza. Hardware es la máquina que
// tocas, y estos tres la completan. Por eso están construidos con el mismo
// lenguaje que la placa —cajas con volumen, la misma luz, las mismas sombras—
// y no como iconos planos: un icono al lado de una placa modelada canta.
//
// Sencillos a propósito. Lo que tiene que leerse es "una pantalla, un teclado,
// un ratón", no un catálogo de producto. Un monitor son tres cajas: panel,
// cuello y base. Un ratón es media elipse. Con eso basta y sobra.
//
// El neón NO son los aparatos: es lo que va ENTRE la placa y ellos. La señal
// sale por los puertos, recorre el cable y llega. Eso sí es luz.

import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  SphereGeometry,
} from 'three/webgpu';
import { color, smoothstep, uniform, uv } from 'three/tsl';

import { CABECERAS, ZONAS } from './layout';
import type { Materiales } from './piezas';

type Punto = readonly [number, number];

const NEON = 0x7fd6ff;
/** Grosor del tubo de neón, en milímetros de placa. */
const TUBO = 3.4;

// Todo en milímetros y con la placa centrada en el origen. −Z es el borde de
// entradas y salidas, +Z el frente. La escala es la real respecto a la placa:
// una micro-ATX mide 244 y un monitor de 24 pulgadas ronda los 530 de ancho.

// Las cotas del monitor están ENCADENADAS, no escritas sueltas: el cuello
// arranca donde acaba la base y el panel arranca dentro del cuello. Escritas
// sueltas es como quedó el panel flotando a 48 mm de su propio pie.
const MONITOR = {
  z: -330,
  base: { an: 210, al: 12, gr: 140, z: 26 },
  cuello: { an: 40, al: 190, gr: 30, z: 18 },
  panel: { an: 530, al: 310, gr: 18, inclina: -0.14 },
  /** Solape del panel sobre el cuello. Sin él vuelve a haber junta abierta. */
  solape: 10,
};
/** Y donde arranca el panel: el alto del cuello menos lo que solapa. */
const Y_PANEL = MONITOR.base.al + MONITOR.cuello.al - MONITOR.solape;

const TECLADO = { x: -24, z: 300, an: 430, al: 18, pr: 150 };
const RATON = { x: 262, z: 296, an: 62, al: 30, pr: 105 };

// --- El neón ----------------------------------------------------------------

/** Justo por encima del plano: es luz sobre él, no un objeto. */
const ALTO_NEON = 0.14;

interface Cinta {
  pos: number[];
  uvs: number[];
  idx: number[];
  v: number;
}

/**
 * Convierte una polilínea en una cinta plana. No se usan líneas de verdad
 * porque su grosor está limitado a un píxel en casi todas partes: una línea de
 * un píxel no puede ser un tubo de neón.
 *
 * En la `u` va el ORDEN dentro del recorrido —de 0 en la placa a 1 en el
 * aparato— y en la `v` la posición transversal. Con esas dos el material
 * resuelve solo el barrido de encendido y el degradado del tubo, sin un
 * atributo extra ni una textura.
 */
function cinta(c: Cinta, camino: Punto[], u0: number, u1: number, ancho: number) {
  // El reparto de `u` es proporcional a la LONGITUD, no al número de tramos: si
  // no, un tramo corto y uno largo se encienden en el mismo tiempo y la luz
  // parece dar tirones.
  const largos: number[] = [];
  let total = 0;
  for (let i = 1; i < camino.length; i++) {
    const d = Math.hypot(camino[i][0] - camino[i - 1][0], camino[i][1] - camino[i - 1][1]);
    largos.push(d);
    total += d;
  }
  if (total <= 0) return;

  let recorrido = 0;
  const h = ancho / 2;

  for (let i = 1; i < camino.length; i++) {
    const [x0, z0] = camino[i - 1];
    const [x1, z1] = camino[i];
    const largo = largos[i - 1] || 1;

    const ua = u0 + ((u1 - u0) * recorrido) / total;
    recorrido += largo;
    const ub = u0 + ((u1 - u0) * recorrido) / total;

    const dx = (x1 - x0) / largo;
    const dz = (z1 - z0) / largo;
    // Se alarga media anchura por punta para que los codos no dejen muesca.
    const ex = dx * h;
    const ez = dz * h;
    const nx = -dz * h;
    const nz = dx * h;

    const ax = x0 - ex;
    const az = z0 - ez;
    const bx = x1 + ex;
    const bz = z1 + ez;

    c.pos.push(
      ax - nx, ALTO_NEON, az - nz,
      ax + nx, ALTO_NEON, az + nz,
      bx + nx, ALTO_NEON, bz + nz,
      bx - nx, ALTO_NEON, bz - nz,
    );
    c.uvs.push(ua, 0, ua, 1, ub, 1, ub, 0);
    c.idx.push(c.v, c.v + 1, c.v + 2, c.v, c.v + 2, c.v + 3);
    c.v += 4;
  }
}

/** Los tres cables, cada uno del puerto que le toca de verdad. */
function cables(): { camino: Punto[]; retardo: number }[] {
  const io = ZONAS.find((z) => z.id === 'io');
  // El vídeo sale por el panel trasero.
  const video: Punto = io ? [io.x + 18, io.z - io.pr / 2] : [-60, -120];
  // El teclado y el ratón, por las cabeceras del borde frontal — que es
  // exactamente donde van los puertos delanteros de una caja.
  const frontal = (i: number): Punto => {
    const c = CABECERAS[i];
    return c ? [c.x, c.z + 4] : [0, 116];
  };

  return [
    { retardo: 0, camino: [video, [video[0], -212], [0, -212], [0, MONITOR.base.z]] },
    { retardo: 0.08, camino: [frontal(2), [frontal(2)[0], 232], [TECLADO.x, 232], [TECLADO.x, TECLADO.z - TECLADO.pr / 2]] },
    { retardo: 0.15, camino: [frontal(4), [frontal(4)[0], 232], [RATON.x, 232], [RATON.x, RATON.z - RATON.pr / 2]] },
  ];
}

// --- Geometría de los aparatos ----------------------------------------------

export interface Dispositivos {
  grupo: Group;
  /** Avance de la capa, de 0 a 1. */
  aplicar(p: number): void;
  soltar(): void;
}

export function dispositivos(m: Materiales): Dispositivos {
  const grupo = new Group();
  const geos: BufferGeometry[] = [];

  // CADA aparato en su propio grupo, anclado en SU base.
  //
  // No es organización: es la corrección de un fallo. Escalando un único grupo
  // con el origen en el centro de la placa, al aparecer los aparatos viajaban
  // desde ese centro hasta su sitio — el monitor salía literalmente de dentro
  // de la placa. Anclado cada uno en su propio pie, crecer es crecer y no
  // desplazarse.
  const nido = (x: number, z: number) => {
    const g = new Group();
    g.position.set(x, 0, z);
    grupo.add(g);
    return g;
  };

  const caja = (
    padre: Group,
    an: number,
    al: number,
    pr: number,
    x: number,
    y: number,
    z: number,
    mat: MeshStandardNodeMaterial,
  ) => {
    const g = new BoxGeometry(an, al, pr);
    geos.push(g);
    const malla = new Mesh(g, mat);
    // Se coloca por la cara INFERIOR, no por el centro: así una pieza que se
    // apoya en algo se escribe con su altura y no con la mitad de su altura, y
    // no hay forma de dejarla flotando por un despiste.
    malla.position.set(x, y + al / 2, z);
    malla.castShadow = true;
    malla.receiveShadow = true;
    padre.add(malla);
    return malla;
  };

  // --- Monitor --------------------------------------------------------------
  const gMonitor = nido(0, MONITOR.z);
  caja(gMonitor, MONITOR.base.an, MONITOR.base.al, MONITOR.base.gr, 0, 0, MONITOR.base.z, m.cuerpo);
  caja(
    gMonitor,
    MONITOR.cuello.an,
    MONITOR.cuello.al,
    MONITOR.cuello.gr,
    0,
    MONITOR.base.al,
    MONITOR.cuello.z,
    m.cuerpo,
  );

  const panel = caja(gMonitor, MONITOR.panel.an, MONITOR.panel.al, MONITOR.panel.gr, 0, Y_PANEL, 0, m.cuerpo);
  // Echado hacia atrás, como todos. Un panel perfectamente vertical se lee como
  // un cartel, no como un monitor.
  panel.rotation.x = MONITOR.panel.inclina;

  // La pantalla: una lámina apenas por delante del panel, oscura pero encendida.
  // Un monitor apagado no dice nada; encendido dice que la máquina funciona.
  const matPantalla = new MeshStandardNodeMaterial({
    color: 0x0a1622,
    metalness: 0.1,
    roughness: 0.28,
  });
  const geoPantalla = new BoxGeometry(MONITOR.panel.an - 26, MONITOR.panel.al - 26, 2);
  geos.push(geoPantalla);
  const pantalla = new Mesh(geoPantalla, matPantalla);
  pantalla.position.set(0, Y_PANEL + MONITOR.panel.al / 2, MONITOR.panel.gr / 2 + 1);
  pantalla.rotation.x = MONITOR.panel.inclina;
  gMonitor.add(pantalla);

  // --- Teclado --------------------------------------------------------------
  const gTeclado = nido(TECLADO.x, TECLADO.z);
  caja(gTeclado, TECLADO.an, TECLADO.al, TECLADO.pr, 0, 0, 0, m.cuerpo);

  // Las teclas van en una sola malla instanciada. Son ciento y pico cajas
  // iguales: dibujarlas una a una sería absurdo, y sin ellas el teclado es un
  // ladrillo.
  const COLS = 21;
  const FILAS = 5;
  const PASO_X = 19;
  const PASO_Z = 19;
  const geoTecla = new BoxGeometry(15, 5, 15);
  geos.push(geoTecla);
  const teclas = new InstancedMesh(geoTecla, m.plastico, COLS * FILAS);
  teclas.castShadow = true;
  teclas.receiveShadow = true;
  const mat4 = new Matrix4();
  let n = 0;
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLS; c++) {
      mat4.makeTranslation(
        (c - (COLS - 1) / 2) * PASO_X,
        TECLADO.al + 2.5,
        (f - (FILAS - 1) / 2) * PASO_Z,
      );
      teclas.setMatrixAt(n++, mat4);
    }
  }
  teclas.instanceMatrix.needsUpdate = true;
  gTeclado.add(teclas);

  // --- Ratón ----------------------------------------------------------------
  // Media elipse. Es la forma con la que se reconoce un ratón desde cualquier
  // ángulo, y sale de una esfera cortada por la mitad: no hace falta más.
  const gRaton = nido(RATON.x, RATON.z);
  const geoRaton = new SphereGeometry(0.5, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  geoRaton.scale(RATON.an, RATON.al * 2, RATON.pr);
  geos.push(geoRaton);
  const raton = new Mesh(geoRaton, m.cuerpo);
  raton.castShadow = true;
  raton.receiveShadow = true;
  gRaton.add(raton);

  // La ranura de los dos botones.
  const geoRanura = new BoxGeometry(1.6, 3, RATON.pr * 0.42);
  geos.push(geoRanura);
  const ranura = new Mesh(geoRanura, m.canal);
  ranura.position.set(0, RATON.al - 1, -RATON.pr * 0.22);
  gRaton.add(ranura);

  // --- El neón entre la placa y los aparatos --------------------------------
  const c: Cinta = { pos: [], uvs: [], idx: [], v: 0 };
  for (const cable of cables()) cinta(c, cable.camino, cable.retardo, cable.retardo + 0.85, TUBO);

  const geoNeon = new BufferGeometry();
  geoNeon.setAttribute('position', new Float32BufferAttribute(c.pos, 3));
  geoNeon.setAttribute('uv', new Float32BufferAttribute(c.uvs, 2));
  geoNeon.setIndex(c.idx);

  const frente = uniform(0);
  const nivel = uniform(0);

  const co = uv();
  // Perfil transversal: brillante en el eje y apagándose hacia el borde. Es lo
  // que convierte una cinta plana en un tubo — sin esto se ve una pegatina.
  const tubo = co.y.sub(0.5).abs().mul(2).oneMinus().pow(2.6);
  // Y el frente de onda: encendido por detrás, apagado por delante.
  const vivo = smoothstep(frente.sub(0.07), frente, co.x).oneMinus();
  const i = tubo.mul(vivo).mul(nivel);

  const matNeon = new MeshBasicNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  matNeon.colorNode = color(NEON).mul(i);
  matNeon.opacityNode = i;

  const mallaNeon = new Mesh(geoNeon, matNeon);
  mallaNeon.frustumCulled = false;
  grupo.add(mallaNeon);

  // --- Aparición ------------------------------------------------------------
  const suave = (t: number) => t * t * (3 - 2 * t);
  const franja = (p: number, a: number, b: number) =>
    suave(Math.min(1, Math.max(0, (p - a) / (b - a))));

  // Cada uno crece desde su propio pie, y escalonados: primero el monitor, que
  // es el que da sentido al resto.
  const nidos: { g: Group; retardo: number }[] = [
    { g: gMonitor, retardo: 0 },
    { g: gTeclado, retardo: 0.05 },
    { g: gRaton, retardo: 0.09 },
  ];
  for (const nn of nidos) nn.g.scale.set(1, 0.0001, 1);
  grupo.visible = false;

  return {
    grupo,

    aplicar(p) {
      // El 0.60 está MEDIDO, no elegido. Antes de ahí la cámara todavía viene
      // de la vista rasante y pasa cerca de la mesa: a p = 0.50 el ratón queda
      // 88 grados fuera de cuadro y el monitor 84. Un aparato que se enciende
      // medio cortado se lee como un fallo, no como un aparato.
      const entra = franja(p, 0.56, 0.68);
      grupo.visible = entra > 0.001;

      // Crecen SOLO en alto, desde su base. Escalando también en planta se
      // arrastrarían hacia su propio centro y se verían deslizarse por la mesa;
      // creciendo en vertical, cada uno se levanta de donde está.
      for (const nn of nidos) {
        const e = franja(p, 0.56 + nn.retardo, 0.68 + nn.retardo);
        nn.g.scale.y = Math.max(0.0001, e);
      }

      nivel.value = entra;
      // 1.15 y no 1: el frente tiene que rebasar el final para que el último
      // tramo del último cable llegue a encenderse del todo. Y acaba antes del
      // aplastado: la luz tiene que haber completado su viaje ANTES de que la
      // máquina se convierta en una capa.
      frente.value = franja(p, 0.59, 0.74) * 1.15;
    },

    soltar() {
      for (const g of geos) g.dispose();
      geoNeon.dispose();
      matNeon.dispose();
      matPantalla.dispose();
      teclas.dispose();
    },
  };
}
