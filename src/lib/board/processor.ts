import { BoxGeometry, Group, Mesh, type MeshStandardNodeMaterial } from 'three/webgpu';

export interface ProcessorMaterials {
  body: MeshStandardNodeMaterial;
  steel: MeshStandardNodeMaterial;
  channel: MeshStandardNodeMaterial;
  fineContact: MeshStandardNodeMaterial;
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

/** The lid is lifted from board.ts, so it needs a name to be found by. */
export const LID_NAME = 'cpu-lid';

const DIE = { side: 15.4, h: 0.55, y: LID_Y };
/** Where the die sits, so the magnified detail can point at it. */
export const DIE_TOP = DIE.y + DIE.h;

interface Block {
  x: number;
  z: number;
  w: number;
  d: number;
  cache?: boolean;
}

// A floorplan, not a random field: six cores in two rows, the shared cache
// underneath them, and the strip that talks to memory down the right side.
const FLOOR: readonly Block[] = [
  { x: -4.6, z: -4.4, w: 3.4, d: 4 },
  { x: -0.9, z: -4.4, w: 3.4, d: 4 },
  { x: 2.8, z: -4.4, w: 3.4, d: 4 },
  { x: -4.6, z: 0.1, w: 3.4, d: 4 },
  { x: -0.9, z: 0.1, w: 3.4, d: 4 },
  { x: 2.8, z: 0.1, w: 3.4, d: 4 },
  { x: -0.9, z: 3.9, w: 10.8, d: 2.2, cache: true },
  { x: 5.6, z: -1.4, w: 1.8, d: 12.4, cache: true },
  { x: -6.6, z: 3.9, w: 1.4, d: 2.2 },
];

export function processor(cx: number, cz: number, m: ProcessorMaterials): Group {
  const g = new Group();

  const layer = (mat: MeshStandardNodeMaterial, yBase: number, side: number, height: number) => {
    const c = new Mesh(new BoxGeometry(side, height, side), mat);
    c.position.set(cx, yBase + height / 2, cz);
    g.add(c);
    return c;
  };

  layer(m.body, SUBSTRATE_Y, SUBSTRATE_SIDE, SUBSTRATE_H);
  layer(m.steel, RIM_Y, RIM_SIDE, RIM_H);

  // The silicon under the lid: dark, and too small to read on purpose.
  const die = new Mesh(new BoxGeometry(DIE.side, DIE.h, DIE.side), m.channel);
  die.position.set(cx, DIE.y + DIE.h / 2, cz);
  g.add(die);

  for (const b of FLOOR) {
    const block = new Mesh(new BoxGeometry(b.w, 0.12, b.d), b.cache ? m.fineContact : m.steel);
    block.position.set(cx + b.x, DIE_TOP + 0.06, cz + b.z);
    g.add(block);
  }

  const lid = layer(m.steel, LID_Y, LID_SIDE, LID_H);
  lid.name = LID_NAME;

  const notch = new Mesh(new BoxGeometry(2.4, SUBSTRATE_H + 0.1, 2.4), m.steel);
  notch.rotation.y = Math.PI / 4;
  notch.position.set(cx - SUBSTRATE_SIDE / 2 + 1.2, SUBSTRATE_Y + SUBSTRATE_H / 2, cz - SUBSTRATE_SIDE / 2 + 1.2);
  g.add(notch);

  return g;
}
