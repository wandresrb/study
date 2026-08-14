import {
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  Scene,
  type WebGPURenderer,
} from 'three/webgpu';
import { color, length, mix, smoothstep, texture, uniform, uv } from 'three/tsl';

import { environment } from './environment';
import { SIDE } from './layout';
import { mask } from './mask';
import { relief, type Materials } from './parts';
import { edge } from './edge';
import { devices } from './devices';
import { seed } from './seeding';
import { pulses } from './pulses';

export const PAL = {
  substrate: 0x12121c,
  aluminum: 0x6b7188,
  plastic: 0x14151d,
  contact: 0x8f96b4,
  body: 0x21222e,
  accent: 0xfab387,
  steel: 0xb9c0d6,
  fineContact: 0x2a2c3c,
  channel: 0x0d0e15,
  light: 0xb4befe,
  grazing: 0xe6ebff,
  bounce: 0xffcda6,
} as const;

export interface Board {
  scene: Scene;
  uPulses: { value: number };
  animate(t: number, intensity: number): void;
  compose(p: number, sunk: number): void;
  dispose(): void;
}

export function build(renderer: WebGPURenderer): Board {
  const scene = new Scene();

  const env = environment(renderer);
  scene.environment = env.texture;
  scene.environmentIntensity = 1.75;

  const uPulses = uniform(0);

  const parts = seed();
  const maps = mask(renderer.getMaxAnisotropy?.() ?? 8, parts);

  const substrateMat = new MeshStandardNodeMaterial();
  substrateMat.colorNode = texture(maps.color, uv());
  const surf = texture(maps.surface, uv());
  substrateMat.metalnessNode = surf.r;
  substrateMat.roughnessNode = surf.g;
  substrateMat.envMapIntensity = 0.3;

  const aluminumMat = new MeshStandardNodeMaterial({
    color: PAL.aluminum,
    metalness: 0.85,
    roughness: 0.34,
  });
  const plasticMat = new MeshStandardNodeMaterial({
    color: PAL.plastic,
    metalness: 0.02,
    roughness: 0.88,
  });
  const contactMat = new MeshStandardNodeMaterial({
    color: PAL.contact,
    metalness: 0.95,
    roughness: 0.26,
  });
  const bodyMat = new MeshStandardNodeMaterial({
    color: PAL.body,
    metalness: 0.1,
    roughness: 0.7,
  });
  const accentMat = new MeshStandardNodeMaterial({
    color: PAL.accent,
    metalness: 0.1,
    roughness: 0.5,
  });

  const channelMat = new MeshStandardNodeMaterial({
    color: PAL.channel,
    metalness: 0.35,
    roughness: 0.55,
  });
  const steelMat = new MeshStandardNodeMaterial({
    color: PAL.steel,
    metalness: 0.96,
    roughness: 0.3,
  });
  const fineContactMat = new MeshStandardNodeMaterial();
  const cell = uv().mul(72).fract().sub(0.5);
  const pin = smoothstep(0.34, 0.2, length(cell));
  fineContactMat.colorNode = mix(color(PAL.fineContact), color(PAL.steel), pin);
  fineContactMat.metalnessNode = pin.mul(0.8).add(0.12);
  fineContactMat.roughnessNode = pin.mul(-0.32).add(0.72);

  const materials: Materials = {
    substrate: substrateMat,
    aluminum: aluminumMat,
    plastic: plasticMat,
    contact: contactMat,
    channel: channelMat,
    body: bodyMat,
    accent: accentMat,
    steel: steelMat,
    fineContact: fineContactMat,
  };

  const group = new Group();

  const machine = new Group();
  group.add(machine);

  const face = new Mesh(new PlaneGeometry(SIDE, SIDE), substrateMat);
  face.rotation.x = -Math.PI / 2;
  face.receiveShadow = true;
  machine.add(face);

  const raised = relief(materials, parts);
  raised.traverse((n) => {
    const o = n as Mesh;
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  machine.add(raised);

  const sparks = pulses();
  machine.add(sparks.mesh);

  const boardEdge = edge();
  machine.add(boardEdge.group);

  const peripherals = devices(materials);
  machine.add(peripherals.group);

  scene.add(group);

  const grazing = new DirectionalLight(PAL.grazing, 12);
  grazing.position.set(-300, 127, 180);
  grazing.castShadow = true;
  grazing.shadow.mapSize.set(2048, 2048);
  grazing.shadow.intensity = 0.6;
  grazing.shadow.radius = 3;
  const c = grazing.shadow.camera;
  c.left = -480;
  c.right = 480;
  c.top = 480;
  c.bottom = -480;
  c.near = 1;
  c.far = 1400;
  grazing.shadow.bias = -0.0006;
  grazing.shadow.normalBias = 0.35;
  scene.add(grazing);

  const bounce = new DirectionalLight(PAL.bounce, 4);
  bounce.position.set(240, 90, -230);
  scene.add(bounce);

  return {
    scene,
    uPulses,

    animate(t, intensity) {
      sparks.update(t, intensity);
    },

    compose(p, sunk) {
      boardEdge.apply(p);
      peripherals.apply(p);
      machine.position.y = -sunk * 820;
      machine.scale.setScalar(1 - sunk * 0.34);
    },

    dispose() {
      group.traverse((n) => {
        const m = n as Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const m of [substrateMat, aluminumMat, plasticMat, contactMat, bodyMat, accentMat, steelMat, fineContactMat, channelMat]) {
        m.dispose();
      }
      sparks.dispose();
      boardEdge.dispose();
      peripherals.dispose();
      maps.dispose();
      env.dispose();
      scene.environment = null;
      scene.clear();
    },
  };
}
