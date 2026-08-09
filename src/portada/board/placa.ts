// La placa: una micro-ATX de 244 mm, con su plano, su máscara y su relieve.
//
// Reparto: lo plano va en textura (`mascara.ts`), lo que sobresale va en
// geometría (`piezas.ts`), y lo que se mueve son los destellos de los buses
// (`pulsos.ts`). Ese reparto no es de comodidad — es que una pista de tres
// décimas de milímetro no puede ser malla, y un disipador con aletas no puede
// ser textura.
//
// La placa es un objeto finito, con borde y con canto. De eso depende que más
// adelante se lea como la primera capa de una pila y no como un suelo infinito.

import {
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  Scene,
  type WebGPURenderer,
} from 'three/webgpu';
import { color, length, mix, screenUV, smoothstep, texture, uniform, uv } from 'three/tsl';

import { entorno } from './entorno';
import { LADO } from './layout';
import { mascara } from './mascara';
import { relieve, type Materiales } from './piezas';
import { canto } from './canto';
import { dispositivos } from './dispositivos';
import { sembrar } from './siembra';
import { pulsos } from './pulsos';

export const PAL = {
  fondo: 0x0e0e15,
  cielo: 0x06060a,
  sustrato: 0x12121c,
  // Aluminio anodizado: metal de verdad, pero oscuro. Ni la plata de antes
  // —que lavaba media placa— ni el plástico mate al que lo bajé después.
  aluminio: 0x6b7188,
  plastico: 0x14151d,
  contacto: 0x8f96b4,
  cuerpo: 0x21222e,
  acento: 0xfab387,
  acero: 0xb9c0d6,
  contactoFino: 0x2a2c3c,
  canal: 0x0d0e15,
  luz: 0xb4befe,
  rasante: 0xe6ebff,
  rebote: 0xffcda6,
} as const;

export interface Placa {
  escena: Scene;
  /** Brillo de los destellos de bus, de 0 a 1. */
  uPulsos: { value: number };
  /** Avanza los destellos. */
  animar(t: number, intensidad: number): void;
  /**
   * `p` es el avance de la cámara, de 0 a 1. `hundido` es cuánto se ha ido la
   * máquina hacia el suelo de la pantalla, también de 0 a 1 — va aparte porque
   * ocurre DESPUÉS de que la cámara haya terminado.
   */
  componer(p: number, hundido: number): void;
  soltar(): void;
}

export function construir(renderer: WebGPURenderer): Placa {
  const escena = new Scene();
  // SIN NIEBLA, y a propósito.
  //
  // Había una `FogExp2` que no pidió nadie, y era la única cosa de la escena
  // cuyo brillo dependía de dónde estuviera la cámara: crece con el cuadrado de
  // la distancia, así que al alejarse para que cupiera la mesa entera lo apagaba
  // todo. O sea que era, literalmente, un cambio de iluminación con el scroll.
  //
  // La profundidad la da el degradado del fondo, que no depende de la cámara.

  // El fondo arranca en el color de la niebla y se oscurece hacia arriba. Sin
  // esto el horizonte se lee como una raya, no como distancia.
  escena.backgroundNode = mix(color(PAL.fondo), color(PAL.cielo), smoothstep(0.3, 1, screenUV.y));

  // Sin entorno los metales son negros: casi no tienen componente difusa, solo
  // reflejan. Y si no hay nada que reflejar, no hay nada que ver.
  const env = entorno(renderer);
  escena.environment = env.textura;
  // Menos entorno y más clave. El entorno entra sobre todo por el especular, y
  // el especular DEPENDE DEL ÁNGULO DE CÁMARA: por eso la placa se iluminaba
  // sola al pasar de cenital a oblicua. La difusa de una direccional no
  // depende de dónde mires, así que cargar el peso ahí deja la exposición
  // quieta durante todo el recorrido.
  // 1.75: bajar de 2.0 reduce la dependencia del ángulo, pero bajar hasta 1.45
  // apagaba los metales —que solo se ven por reflejo— y era justo lo que tenía
  // que destellar. La estabilidad frente a la cámara la da sobre todo la
  // rugosidad de la máscara, no recortar el entorno.
  escena.environmentIntensity = 1.75;

  const uPulsos = uniform(0);

  // --- Superficie -----------------------------------------------------------

  // Una sola siembra para las dos: la textura dibuja los pads y las pistas de
  // cada pieza, y la geometría planta esas mismas piezas encima.
  const piezas = sembrar();
  const mapas = mascara(renderer.getMaxAnisotropy?.() ?? 8, piezas);

  const matSustrato = new MeshStandardNodeMaterial();
  matSustrato.colorNode = texture(mapas.color, uv());
  // R = metálico, G = rugoso. Un solo muestreo para los dos.
  const sup = texture(mapas.superficie, uv());
  matSustrato.metalnessNode = sup.r;
  matSustrato.roughnessNode = sup.g;
  // ESTA línea es la que estabiliza la exposición durante el recorrido.
  //
  // Al hacer scroll lo único que cambia es la cámara, y de los términos del
  // sombreado solo uno depende de ella: el especular. La difusa —de las
  // direccionales y del entorno— es la misma se mire desde donde se mire. Y el
  // especular se dispara en ángulo rasante por Fresnel: de ahí que la vista
  // cenital saliera oscura y la oblicua lavada.
  //
  // El sustrato ocupa casi todo el encuadre, así que su especular es todo el
  // problema. Bajándole el entorno a 0.3 desaparece el vaivén, y los metales
  // —que son poca superficie y cuyo destello sí queremos— no se tocan.
  matSustrato.envMapIntensity = 0.3;

  const matAluminio = new MeshStandardNodeMaterial({
    color: PAL.aluminio,
    metalness: 0.85,
    roughness: 0.34,
  });
  // Mate de verdad. Un cuerpo de conector es plástico moldeado: si tiene brillo
  // se lee como un marco metálico, que es justo lo que no es.
  const matPlastico = new MeshStandardNodeMaterial({
    color: PAL.plastico,
    metalness: 0.02,
    roughness: 0.88,
  });
  const matContacto = new MeshStandardNodeMaterial({
    color: PAL.contacto,
    metalness: 0.95,
    roughness: 0.26,
  });
  const matCuerpo = new MeshStandardNodeMaterial({
    color: PAL.cuerpo,
    metalness: 0.1,
    roughness: 0.7,
  });
  const matAcento = new MeshStandardNodeMaterial({
    color: PAL.acento,
    metalness: 0.1,
    roughness: 0.5,
  });

  const matCanal = new MeshStandardNodeMaterial({
    color: PAL.canal,
    metalness: 0.35,
    roughness: 0.55,
  });
  const matAcero = new MeshStandardNodeMaterial({
    color: PAL.acero,
    metalness: 0.96,
    roughness: 0.3,
  });
  // La matriz de contactos del socket. Son mil setecientos pads a medio
  // milímetro de paso: como geometría sería absurdo y como color plano se lee
  // —con razón— como un cuadrado liso. Va procedural, que además no cuesta ni
  // un byte de textura.
  const matContactoFino = new MeshStandardNodeMaterial();
  const celda = uv().mul(72).fract().sub(0.5);
  const pin = smoothstep(0.34, 0.2, length(celda));
  matContactoFino.colorNode = mix(color(PAL.contactoFino), color(PAL.acero), pin);
  matContactoFino.metalnessNode = pin.mul(0.8).add(0.12);
  matContactoFino.roughnessNode = pin.mul(-0.32).add(0.72);

  const materiales: Materiales = {
    sustrato: matSustrato,
    aluminio: matAluminio,
    plastico: matPlastico,
    contacto: matContacto,
    canal: matCanal,
    cuerpo: matCuerpo,
    acento: matAcento,
    acero: matAcero,
    contactoFino: matContactoFino,
  };

  // --- Geometría ------------------------------------------------------------

  const grupo = new Group();

  // La máquina va en su propio grupo. El apilado ya NO ocurre aquí: cuando la
  // escena 3D termina, el lienzo se desvanece y la pila la dibuja HTML y CSS.
  // Aplastar mallas para simular un diagrama era justo lo contrario de lo que
  // hacía falta — geometría iluminada sin perspectiva sigue siendo geometría.
  const maquina = new Group();
  grupo.add(maquina);

  const cara = new Mesh(new PlaneGeometry(LADO, LADO), matSustrato);
  cara.rotation.x = -Math.PI / 2;
  cara.receiveShadow = true;
  maquina.add(cara);

  const alzado = relieve(materiales, piezas);
  // Todo lo que sobresale arroja sombra y la recibe; la cara de la placa solo
  // la recibe.
  alzado.traverse((n) => {
    const o = n as Mesh;
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  maquina.add(alzado);

  // El encendido de los buses trae su propio material y su propia tabla de
  // brillos: se enciende la pista entera, no un punto viajando por ella.
  const chispas = pulsos();
  maquina.add(chispas.malla);

  // El grosor de la placa, para que a cámara oblicua se lea como objeto.
  const filo = canto();
  maquina.add(filo.grupo);

  // Y lo que la placa mueve. Van en ESTA escena y con esta luz: un icono plano
  // al lado de una placa modelada canta. Además así la señal puede seguir de la
  // pista al cable sin empalme, porque es el mismo fenómeno saliendo.
  const trastos = dispositivos(materiales);
  maquina.add(trastos.grupo);

  escena.add(grupo);

  // --- Luz ------------------------------------------------------------------

  // La clave. 20° de elevación: a los 25° originales no rasaba nada, pero a los
  // 10° a los que la bajé la sombra de un disipador de 23 mm cruzaba media
  // placa. 20° conserva el filo en las aletas y acorta la sombra a algo más de
  // dos veces la altura de la pieza.
  //
  // Es la única que proyecta sombra. Sin sombras, un disipador de 23 mm sobre
  // una placa plana parece pegado encima en vez de apoyado, y ese era el
  // defecto que más pesaba de todos.
  // Bajada de 19 a 12: con el especular del sustrato ya contenido no hace falta
  // tanta clave, y a 19 la luz se leía como un foco de teatro.
  //
  // Estuvo un rato a 26 por una medición mía que era falsa: al mirar la escena
  // congelando el hilo, la interpolación de entrada se quedaba a medias, la
  // cámara a 2,15 veces la distancia y la niebla —exponencial con la
  // distancia— se comía la placa entera. Eso no era falta de luz. La lección va
  // escrita aquí porque el síntoma es idéntico al de una escena mal iluminada:
  // si la placa se ve apagada, antes de tocar nada hay que comprobar que la
  // entrada ya ha terminado.
  const rasante = new DirectionalLight(PAL.rasante, 12);
  rasante.position.set(-300, 127, 180);
  rasante.castShadow = true;
  // 2048 y no 1024, y no es capricho: el volumen de sombra pasa de cubrir la
  // placa a cubrir la mesa entera —de ±150 mm a ±480—, así que con el mapa
  // anterior cada texel abarcaría tres veces más superficie y el filo de los
  // disipadores se convertiría en escalera. Al doblarlo, la densidad queda casi
  // como estaba.
  rasante.shadow.mapSize.set(2048, 2048);
  // La sombra estaba pero era un agujero negro. Al 60 % marca el apoyo de cada
  // pieza sin comerse lo que hay debajo.
  rasante.shadow.intensity = 0.6;
  rasante.shadow.radius = 3;
  // El volumen tiene que cubrir la mesa, no solo la placa: el monitor está a
  // 330 mm por detrás y el teclado a 300 por delante. Lo que quede fuera no
  // proyecta sombra, y una pieza sin sombra se lee como pegada encima.
  const c = rasante.shadow.camera;
  c.left = -480;
  c.right = 480;
  c.top = 480;
  c.bottom = -480;
  c.near = 1;
  c.far = 1400;
  rasante.shadow.bias = -0.0006;
  rasante.shadow.normalBias = 0.35;
  escena.add(rasante);

  // El rebote, y CÁLIDO. Con todo del mismo azul, ninguna arista separaba un
  // plano de otro: cada superficie recibía luz del mismo tono mirase donde
  // mirase. La diferencia de tono es la que dibuja el relieve.
  // Sube de 2.1 a 4: es difusa, o sea que NO depende de la cámara, así que
  // recuperar nivel por aquí no reintroduce el vaivén.
  const rebote = new DirectionalLight(PAL.rebote, 4);
  rebote.position.set(240, 90, -230);
  escena.add(rebote);

  // Sin luz ambiente. Es energía sin dirección: borra el oscurecimiento de
  // contacto y deja todo como plástico uniforme. El ambiente lo hace el
  // entorno, que al menos viene de algún sitio.

  return {
    escena,
    uPulsos,

    animar(t, intensidad) {
      chispas.actualizar(t, intensidad);
    },

    componer(p, hundido) {
      filo.aplicar(p);
      trastos.aplicar(p);
      // Se va al suelo de la pantalla y se sale por abajo. NO se aplasta: eso
      // se probó y solo dejaba geometría rara. Lo que hace es irse, que es lo
      // que tiene que pasar cuando algo se mete en una pila y deja de ser
      // visible como objeto.
      maquina.position.y = -hundido * 820;
      maquina.scale.setScalar(1 - hundido * 0.34);
    },

    soltar() {
      grupo.traverse((n) => {
        const m = n as Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const m of [matSustrato, matAluminio, matPlastico, matContacto, matCuerpo, matAcento, matAcero, matContactoFino, matCanal]) {
        m.dispose();
      }
      chispas.soltar();
      filo.soltar();
      trastos.soltar();
      mapas.soltar();
      env.soltar();
      escena.environment = null;
      escena.clear();
    },
  };
}
