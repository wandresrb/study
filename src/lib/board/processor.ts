import { BoxGeometry, Group, Mesh, type MeshStandardNodeMaterial } from 'three/webgpu';

export interface ProcessorMaterials {
  body: MeshStandardNodeMaterial;
  steel: MeshStandardNodeMaterial;
}

export const SUBSTRATE_SIDE = 37;
const RIM_SIDE = 34;
const LID_SIDE = 30;

const SUBSTRATE_H = 1;
const RIM_H = 0.8;
const LID_H = 2.5;

const SUBSTRATE_Y = 0;
const RIM_Y = SUBSTRATE_Y + SUBSTRATE_H;
const LID_Y = RIM_Y + RIM_H;
export const HEIGHT = LID_Y + LID_H;

export function processor(cx: number, cz: number, m: ProcessorMaterials): Group {
  const g = new Group();

  const layer = (
    mat: MeshStandardNodeMaterial,
    yBase: number,
    side: number,
    height: number,
  ) => {
    const c = new Mesh(new BoxGeometry(side, height, side), mat);
    c.position.set(cx, yBase + height / 2, cz);
    g.add(c);
  };

  layer(m.body, SUBSTRATE_Y, SUBSTRATE_SIDE, SUBSTRATE_H);
  layer(m.steel, RIM_Y, RIM_SIDE, RIM_H);
  layer(m.steel, LID_Y, LID_SIDE, LID_H);

  const notch = new Mesh(new BoxGeometry(2.4, SUBSTRATE_H + 0.1, 2.4), m.steel);
  notch.rotation.y = Math.PI / 4;
  notch.position.set(
    cx - SUBSTRATE_SIDE / 2 + 1.2,
    SUBSTRATE_Y + SUBSTRATE_H / 2,
    cz - SUBSTRATE_SIDE / 2 + 1.2,
  );
  g.add(notch);

  return g;
}
