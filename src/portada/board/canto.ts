// El canto de la placa.
//
// Una placa vista de lado tiene grosor, y sin él la escena se lee como un
// dibujo pegado al fondo en vez de como un objeto. Eso es todo lo que hace
// esto.
//
// Estuvo en 16 mm y era un pedestal: convertía la placa en una losa de granito.
// Un PCB de verdad mide 1,6 mm; aquí van 5, que es mentira, pero es la mentira
// justa para que el filo se vea a cámara rasante sin que parezca un altar.
//
// No hay ningún piso encima. El de software llega cuando exista software.

import {
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardNodeMaterial,
} from 'three/webgpu';

import { LADO } from './layout';

/** Grosor visible del canto. */
const CANTO = 5;

const suave = (t: number) => t * t * (3 - 2 * t);
const franja = (p: number, a: number, b: number) =>
  suave(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface Canto {
  grupo: Group;
  aplicar(p: number): void;
  soltar(): void;
}

export function canto(): Canto {
  const grupo = new Group();

  // Una caja cuya cara SUPERIOR está en y = 0, o sea justo bajo la placa. Se
  // estira hacia abajo, así que la placa nunca se mueve: lo que aparece es su
  // grosor. Trasladar la geometría en vez de la malla es lo que permite escalar
  // sin que se despegue del sustrato.
  const geo = new BoxGeometry(LADO, 1, LADO);
  geo.translate(0, -0.5, 0);
  const mat = new MeshStandardNodeMaterial({
    color: 0x0f1018,
    metalness: 0.1,
    roughness: 0.82,
  });
  const caja = new Mesh(geo, mat);
  // NO proyecta sombra, y no es un detalle: su cara superior es coplanar con la
  // superficie de la placa, así que el mapa de sombras comparaba profundidades
  // iguales y sombreaba la placa ENTERA — se quedaba casi negra y con tinte
  // cálido, que era lo único que le llegaba del rebote. Y no se pierde nada:
  // tiene la misma huella que la placa que lleva encima.
  caja.castShadow = false;
  caja.receiveShadow = true;
  // Medio pelo por debajo, para que las dos caras no peleen por el mismo plano.
  caja.position.y = -0.05;
  caja.scale.y = 0.001;
  grupo.add(caja);

  // Una línea de luz en la arista de arriba: separa la placa de su canto. Sin
  // ella los dos tonos oscuros se funden y el filo desaparece.
  const geoFilo = new EdgesGeometry(new BoxGeometry(LADO, CANTO, LADO));
  const matFilo = new LineBasicMaterial({ color: 0x2a2c3e, transparent: true, opacity: 0 });
  const filo = new LineSegments(geoFilo, matFilo);
  filo.position.y = -CANTO / 2;
  grupo.add(filo);

  return {
    grupo,

    aplicar(p) {
      // Aparece cuando la cámara ya está oblicua: desde arriba no hay canto que
      // ver. Y NO se retira al final — en el alzado lateral el canto es
      // justamente lo que se ve, la barra en la que colapsa todo.
      const oblicua = franja(p, 0.28, 0.48);
      caja.scale.y = Math.max(0.001, oblicua * CANTO);
      matFilo.opacity = oblicua * 0.9;
    },

    soltar() {
      geo.dispose();
      geoFilo.dispose();
      mat.dispose();
      matFilo.dispose();
    },
  };
}
