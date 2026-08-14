import { BoxGeometry, Group, Mesh, type MeshStandardNodeMaterial } from 'three/webgpu';

export interface MaterialesProcesador {
  cuerpo: MeshStandardNodeMaterial;
  acero: MeshStandardNodeMaterial;
}

export const LADO_SUSTRATO = 37;
const LADO_REBORDE = 34;
const LADO_TAPA = 30;

const ALTO_SUSTRATO = 1;
const ALTO_REBORDE = 0.8;
const ALTO_TAPA = 2.5;

const Y_SUSTRATO = 0;
const Y_REBORDE = Y_SUSTRATO + ALTO_SUSTRATO;
const Y_TAPA = Y_REBORDE + ALTO_REBORDE;
export const ALTO = Y_TAPA + ALTO_TAPA;

export function procesador(cx: number, cz: number, m: MaterialesProcesador): Group {
  const g = new Group();

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
