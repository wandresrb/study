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

import { entorno } from './entorno';
import { LADO } from './layout';
import { mascara } from './mascara';
import { relieve, type Materiales } from './piezas';
import { canto } from './canto';
import { dispositivos } from './dispositivos';
import { sembrar } from './siembra';
import { pulsos } from './pulsos';

export const PAL = {
  sustrato: 0x12121c,
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
  uPulsos: { value: number };
  animar(t: number, intensidad: number): void;
  componer(p: number, hundido: number): void;
  soltar(): void;
}

export function construir(renderer: WebGPURenderer): Placa {
  const escena = new Scene();

  const env = entorno(renderer);
  escena.environment = env.textura;
  escena.environmentIntensity = 1.75;

  const uPulsos = uniform(0);

  const piezas = sembrar();
  const mapas = mascara(renderer.getMaxAnisotropy?.() ?? 8, piezas);

  const matSustrato = new MeshStandardNodeMaterial();
  matSustrato.colorNode = texture(mapas.color, uv());
  const sup = texture(mapas.superficie, uv());
  matSustrato.metalnessNode = sup.r;
  matSustrato.roughnessNode = sup.g;
  matSustrato.envMapIntensity = 0.3;

  const matAluminio = new MeshStandardNodeMaterial({
    color: PAL.aluminio,
    metalness: 0.85,
    roughness: 0.34,
  });
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

  const grupo = new Group();

  const maquina = new Group();
  grupo.add(maquina);

  const cara = new Mesh(new PlaneGeometry(LADO, LADO), matSustrato);
  cara.rotation.x = -Math.PI / 2;
  cara.receiveShadow = true;
  maquina.add(cara);

  const alzado = relieve(materiales, piezas);
  alzado.traverse((n) => {
    const o = n as Mesh;
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  maquina.add(alzado);

  const chispas = pulsos();
  maquina.add(chispas.malla);

  const filo = canto();
  maquina.add(filo.grupo);

  const trastos = dispositivos(materiales);
  maquina.add(trastos.grupo);

  escena.add(grupo);

  const rasante = new DirectionalLight(PAL.rasante, 12);
  rasante.position.set(-300, 127, 180);
  rasante.castShadow = true;
  rasante.shadow.mapSize.set(2048, 2048);
  rasante.shadow.intensity = 0.6;
  rasante.shadow.radius = 3;
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

  const rebote = new DirectionalLight(PAL.rebote, 4);
  rebote.position.set(240, 90, -230);
  escena.add(rebote);

  return {
    escena,
    uPulsos,

    animar(t, intensidad) {
      chispas.actualizar(t, intensidad);
    },

    componer(p, hundido) {
      filo.aplicar(p);
      trastos.aplicar(p);
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
