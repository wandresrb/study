// El procesador, instalado.
//
// No es un socket vacío. Un socket vacío obliga a modelar la chapa de
// retención con su ventana lobulada, la palanca y los flejes — chapa estampada
// con curvas compuestas, y eso con cajas no sale. Con el procesador puesto, la
// tapa metálica cubre todo eso y lo que queda son tres cajas apiladas.
//
//   0.0   cara de la placa
//   1.0   cara alta del sustrato   ← el PCB del propio chip
//   1.8   cara alta del reborde    ← la pestaña que rodea la tapa
//   4.3   cara alta del IHS        ← la tapa de níquel, lo que se ve
//
// Cada altura sale de la anterior. Ninguna se escribe suelta: escribirlas
// sueltas es lo que dejaba piezas flotando en los intentos anteriores.

import { BoxGeometry, Group, Mesh, type MeshStandardNodeMaterial } from 'three/webgpu';

export interface MaterialesProcesador {
  /** El sustrato del chip: oscuro y mate. */
  cuerpo: MeshStandardNodeMaterial;
  /** La tapa: níquel. */
  acero: MeshStandardNodeMaterial;
}

/** Lado del sustrato. Un procesador de escritorio ronda esta medida. */
export const LADO_SUSTRATO = 37;
const LADO_REBORDE = 34;
const LADO_TAPA = 30;

const ALTO_SUSTRATO = 1;
const ALTO_REBORDE = 0.8;
const ALTO_TAPA = 2.5;

const Y_SUSTRATO = 0;
const Y_REBORDE = Y_SUSTRATO + ALTO_SUSTRATO;
const Y_TAPA = Y_REBORDE + ALTO_REBORDE;
/** Alto total. Lo consume el plano para declarar la zona. */
export const ALTO = Y_TAPA + ALTO_TAPA;

export function procesador(cx: number, cz: number, m: MaterialesProcesador): Group {
  const g = new Group();

  /** Coloca por la cara INFERIOR, no por el centro. */
  const capa = (
    mat: MeshStandardNodeMaterial,
    yBase: number,
    lado: number,
    alto: number,
  ) => {
    const c = new Mesh(new BoxGeometry(lado, alto, lado), mat);
    c.position.set(cx, yBase + alto / 2, cz);
    g.add(c);
  };

  capa(m.cuerpo, Y_SUSTRATO, LADO_SUSTRATO, ALTO_SUSTRATO);
  capa(m.acero, Y_REBORDE, LADO_REBORDE, ALTO_REBORDE);
  capa(m.acero, Y_TAPA, LADO_TAPA, ALTO_TAPA);

  // La muesca de la esquina: la marca de patilla uno. Un milímetro, pero es lo
  // que orienta la pieza y evita que se lea como un cubo cualquiera.
  const muesca = new Mesh(new BoxGeometry(2.4, ALTO_SUSTRATO + 0.1, 2.4), m.acero);
  muesca.rotation.y = Math.PI / 4;
  muesca.position.set(
    cx - LADO_SUSTRATO / 2 + 1.2,
    Y_SUSTRATO + ALTO_SUSTRATO / 2,
    cz - LADO_SUSTRATO / 2 + 1.2,
  );
  g.add(muesca);

  return g;
}
