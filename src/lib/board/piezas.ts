import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  type MeshStandardNodeMaterial,
  Object3D,
} from 'three/webgpu';

import {
  BOBINAS,
  CABECERAS,
  CONDENSADORES,
  RADIO_CONDENSADOR,
  GROSOR,
  PASO_PIN_CABECERA,
  PILA,
  ZONAS,
  type Zona,
} from './layout';
import { taladros } from './agujeros';
import { procesador } from './procesador';
import { HUELLAS, type Pieza } from './siembra';

export interface Materiales {
  sustrato: MeshStandardNodeMaterial;
  aluminio: MeshStandardNodeMaterial;
  plastico: MeshStandardNodeMaterial;
  contacto: MeshStandardNodeMaterial;
  canal: MeshStandardNodeMaterial;
  cuerpo: MeshStandardNodeMaterial;
  acento: MeshStandardNodeMaterial;
  acero: MeshStandardNodeMaterial;
  contactoFino: MeshStandardNodeMaterial;
}

const molde = new Object3D();

function disipador(s: Zona, m: Materiales): Group {
  const g = new Group();
  const base = new Mesh(new BoxGeometry(s.an, s.al * 0.34, s.pr), m.aluminio);
  base.position.set(s.x, (s.al * 0.34) / 2, s.z);
  g.add(base);

  const alLargo = s.pr > s.an;
  const largo = alLargo ? s.pr : s.an;
  const ancho = alLargo ? s.an : s.pr;
  const n = Math.max(3, Math.round(ancho / 4.4));
  const aletas = new InstancedMesh(new BoxGeometry(1, 1, 1), m.aluminio, n);
  aletas.frustumCulled = false;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - 0.5) * (ancho - 2.4);
    molde.position.set(
      s.x + (alLargo ? t : 0),
      s.al * 0.34 + (s.al * 0.66) / 2,
      s.z + (alLargo ? 0 : t),
    );
    molde.rotation.set(0, 0, 0);
    molde.scale.set(alLargo ? 1.7 : largo - 2, s.al * 0.66, alLargo ? largo - 2 : 1.7);
    molde.updateMatrix();
    aletas.setMatrixAt(i, molde.matrix);
  }
  aletas.instanceMatrix.needsUpdate = true;
  g.add(aletas);
  return g;
}

function ranura(s: Zona, m: Materiales): Group {
  const g = new Group();
  const alLargo = s.pr > s.an;
  const largo = alLargo ? s.pr : s.an;
  const ancho = alLargo ? s.an : s.pr;
  const alto = s.al;

  const cuerpo = new Group();

  const pared = ancho * 0.3;
  const hueco = ancho - pared * 2;
  for (const lado of [-1, 1]) {
    const w = new Mesh(new BoxGeometry(pared, alto, largo), m.plastico);
    w.position.set(lado * (ancho / 2 - pared / 2), alto / 2, 0);
    cuerpo.add(w);
  }

  for (const lado of [-1, 1]) {
    const c = new Mesh(new BoxGeometry(ancho, alto, pared), m.plastico);
    c.position.set(0, alto / 2, lado * (largo / 2 - pared / 2));
    cuerpo.add(c);
  }

  const fondo = new Mesh(new BoxGeometry(hueco, alto * 0.3, largo - pared * 2), m.canal);
  fondo.position.set(0, alto * 0.15, 0);
  cuerpo.add(fondo);

  const MUESCA: Record<string, number> = { pcie16: 0.17, pcie1: 0.26, atx: 0.5 };
  const f = MUESCA[s.id] ?? 0.44;
  const tabique = new Mesh(new BoxGeometry(hueco, alto * 0.72, 2.2), m.contacto);
  tabique.position.set(0, alto * 0.36, (f - 0.5) * largo);
  cuerpo.add(tabique);

  if (s.id.startsWith('dimm') || s.id === 'pcie16' || s.id === 'pcie1') {
    for (const lado of s.id.startsWith('dimm') ? [-1, 1] : [1]) {
      const palanca = new Group();
      const tramos: [number, number, number, number][] = [
        [ancho * 1.5, alto * 0.85, 5.2, alto * 0.42],
        [ancho * 1.1, alto * 0.7, 3.2, alto * 1.1],
        [ancho * 1.7, alto * 0.4, 4.4, alto * 1.62],
      ];
      for (const [an, al, pr, cy] of tramos) {
        const c = new Mesh(new BoxGeometry(an, al, pr), m.plastico);
        c.position.set(0, cy, 0);
        palanca.add(c);
      }
      palanca.position.z = lado * (largo / 2 + 3);
      cuerpo.add(palanca);
    }
  }

  if (s.id === 'pcie16') {
    for (const lado of [-1, 1]) {
      const b = new Mesh(new BoxGeometry(1.2, alto * 0.9, largo), m.plastico);
      b.position.set(lado * (ancho / 2 + 0.6), alto * 0.5, 0);
      cuerpo.add(b);
    }
  }

  if (!alLargo) cuerpo.rotation.y = Math.PI / 2;
  cuerpo.position.set(s.x, 0, s.z);
  g.add(cuerpo);
  return g;
}

export function relieve(m: Materiales, sitios: readonly Pieza[]): Group {
  const g = new Group();
  for (const s of ZONAS) {
    switch (s.tipo) {
      case 'disipador':
        g.add(disipador(s, m));
        break;
      case 'ranura': {
        g.add(ranura(s, m));
        break;
      }
      case 'cpu':
        g.add(procesador(s.x, s.z, m));
        break;
      case 'carcasa': {
        const c = new Mesh(new BoxGeometry(s.an, s.al, s.pr), m.plastico);
        c.position.set(s.x, s.al / 2, s.z);
        g.add(c);
        break;
      }
      case 'placa': {
        const p = new Mesh(new BoxGeometry(s.an, s.al, s.pr), m.cuerpo);
        p.position.set(s.x, s.al / 2, s.z);
        g.add(p);
        break;
      }
    }
  }

  const metal = sitios.filter((s) => s.t < 0.2);
  const mate = sitios.filter((s) => s.t >= 0.2);

  const tinte = new Color();
  const oscuro = new Color(0x24263a);
  const plantar = (lista: typeof sitios, mat: MeshStandardNodeMaterial, tintar: boolean) => {
    const malla = new InstancedMesh(new BoxGeometry(1, 1, 1), mat, lista.length);
    malla.frustumCulled = false;
    for (let i = 0; i < lista.length; i++) {
      const s = lista[i];
      const f = HUELLAS[s.huella];
      molde.position.set(s.x, f.al / 2, s.z);
      molde.rotation.set(0, s.giro === 1 ? Math.PI / 2 : 0, 0);
      molde.scale.set(f.an, f.al, f.pr);
      molde.updateMatrix();
      malla.setMatrixAt(i, molde.matrix);
      if (tintar) {
        tinte.copy(oscuro).multiplyScalar(0.75 + s.t * 0.7);
        malla.setColorAt(i, tinte);
      }
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    g.add(malla);
    return malla;
  };
  plantar(mate, m.cuerpo, true);
  plantar(metal, m.aluminio, false);
  const sitiosChip = sitios;

  const chip = sitiosChip.filter((s) => s.huella !== 'soic' && s.huella !== 'dfn');
  const terminales = new InstancedMesh(new BoxGeometry(1, 1, 1), m.contacto, chip.length * 2);
  terminales.frustumCulled = false;
  let nc = 0;
  for (const s of chip) {
    const f = HUELLAS[s.huella];
    const largo = f.an;
    const ancho = f.pr;
    const tapa = largo * 0.26;
    for (const lado of [-1, 1]) {
      const d = lado * (largo / 2 - tapa / 2);
      molde.position.set(
        s.x + (s.giro === 1 ? 0 : d),
        f.al * 0.52,
        s.z + (s.giro === 1 ? d : 0),
      );
      molde.rotation.set(0, s.giro === 1 ? Math.PI / 2 : 0, 0);
      molde.scale.set(tapa, f.al * 1.04, ancho * 1.06);
      molde.updateMatrix();
      terminales.setMatrixAt(nc++, molde.matrix);
    }
  }
  terminales.count = nc;
  terminales.instanceMatrix.needsUpdate = true;
  g.add(terminales);

  const bob = HUELLAS.bobina;
  const bobinas = new InstancedMesh(new BoxGeometry(1, 1, 1), m.cuerpo, BOBINAS.length);
  bobinas.frustumCulled = false;
  BOBINAS.forEach((b, i) => {
    molde.position.set(b.x, bob.al / 2, b.z);
    molde.rotation.set(0, 0, 0);
    molde.scale.set(bob.an, bob.al, bob.pr);
    molde.updateMatrix();
    bobinas.setMatrixAt(i, molde.matrix);
  });
  bobinas.instanceMatrix.needsUpdate = true;
  g.add(bobinas);

  const tapas = new InstancedMesh(new BoxGeometry(1, 1, 1), m.contacto, BOBINAS.length);
  tapas.frustumCulled = false;
  BOBINAS.forEach((b, i) => {
    molde.position.set(b.x, bob.al + 0.25, b.z);
    molde.rotation.set(0, 0, 0);
    molde.scale.set(bob.an * 0.82, 0.5, bob.pr * 0.82);
    molde.updateMatrix();
    tapas.setMatrixAt(i, molde.matrix);
  });
  tapas.instanceMatrix.needsUpdate = true;
  g.add(tapas);

  const caps = new InstancedMesh(new CylinderGeometry(1, 1, 1, 24), m.cuerpo, CONDENSADORES.length);
  caps.frustumCulled = false;
  CONDENSADORES.forEach(({ x, z }, i) => {
    const r = RADIO_CONDENSADOR;
    const h = 9.5;
    molde.position.set(x, h / 2, z);
    molde.rotation.set(0, 0, 0);
    molde.scale.set(r, h, r);
    molde.updateMatrix();
    caps.setMatrixAt(i, molde.matrix);
  });
  caps.instanceMatrix.needsUpdate = true;
  g.add(caps);

  const tapasCap = new InstancedMesh(new CylinderGeometry(1, 1, 1, 20), m.contacto, CONDENSADORES.length);
  tapasCap.frustumCulled = false;
  CONDENSADORES.forEach(({ x, z }, i) => {
    molde.position.set(x, 9.7, z);
    molde.rotation.set(0, 0, 0);
    molde.scale.set(RADIO_CONDENSADOR * 0.86, 0.4, RADIO_CONDENSADOR * 0.86);
    molde.updateMatrix();
    tapasCap.setMatrixAt(i, molde.matrix);
  });
  tapasCap.instanceMatrix.needsUpdate = true;
  g.add(tapasCap);

  const PASO_CONTACTO = 0.85;
  const ranuras = ZONAS.filter((z) => z.tipo === 'ranura');
  let totalContactos = 0;
  for (const z of ranuras) {
    const largo = Math.max(z.an, z.pr);
    totalContactos += Math.floor(largo / PASO_CONTACTO) * 2;
  }
  const contactos = new InstancedMesh(new BoxGeometry(1, 1, 1), m.cuerpo, totalContactos);
  contactos.frustumCulled = false;
  let ncon = 0;
  for (const z of ranuras) {
    const alLargo = z.pr > z.an;
    const largo = alLargo ? z.pr : z.an;
    const ancho = alLargo ? z.an : z.pr;
    const n = Math.floor(largo / PASO_CONTACTO);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * (largo - 3);
      for (const lado of [-1, 1]) {
        const off = lado * ancho * 0.16;
        molde.position.set(
          z.x + (alLargo ? off : t),
          z.al * 0.6,
          z.z + (alLargo ? t : off),
        );
        molde.rotation.set(0, 0, 0);
        molde.scale.set(alLargo ? 0.36 : 0.44, z.al * 0.36, alLargo ? 0.44 : 0.36);
        molde.updateMatrix();
        contactos.setMatrixAt(ncon++, molde.matrix);
      }
    }
  }
  contactos.count = ncon;
  contactos.instanceMatrix.needsUpdate = true;
  g.add(contactos);

  let totalPines = 0;
  for (const c of CABECERAS) totalPines += c.pines * 2;

  const zocalos = new InstancedMesh(new BoxGeometry(1, 1, 1), m.plastico, CABECERAS.length);
  zocalos.frustumCulled = false;
  CABECERAS.forEach((c, i) => {
    const ancho = c.pines * PASO_PIN_CABECERA;
    molde.position.set(c.x + ancho / 2 - PASO_PIN_CABECERA / 2, 1.2, c.z);
    molde.rotation.set(0, 0, 0);
    molde.scale.set(ancho, 2.4, PASO_PIN_CABECERA * 2);
    molde.updateMatrix();
    zocalos.setMatrixAt(i, molde.matrix);
  });
  zocalos.instanceMatrix.needsUpdate = true;
  g.add(zocalos);

  const pines = new InstancedMesh(new BoxGeometry(1, 1, 1), m.contacto, totalPines);
  pines.frustumCulled = false;
  let np = 0;
  for (const c of CABECERAS) {
    for (let hilera = 0; hilera < 2; hilera++) {
      for (let i = 0; i < c.pines; i++) {
        molde.position.set(
          c.x + i * PASO_PIN_CABECERA,
          3.2,
          c.z + (hilera - 0.5) * PASO_PIN_CABECERA,
        );
        molde.rotation.set(0, 0, 0);
        molde.scale.set(0.64, 4, 0.64);
        molde.updateMatrix();
        pines.setMatrixAt(np++, molde.matrix);
      }
    }
  }
  pines.instanceMatrix.needsUpdate = true;
  g.add(pines);

  const pila = new Mesh(new CylinderGeometry(PILA.r, PILA.r, 3.2, 28), m.acero);
  pila.position.set(PILA.x, 1.6, PILA.z);
  g.add(pila);
  const cuna = new Mesh(new BoxGeometry(PILA.r * 2.3, 1.4, PILA.r * 1.5), m.plastico);
  cuna.position.set(PILA.x, 0.7, PILA.z);
  g.add(cuna);
  const pinza = new Mesh(new BoxGeometry(3, 4.4, 6), m.acero);
  pinza.position.set(PILA.x + PILA.r + 1.4, 2.2, PILA.z);
  g.add(pinza);

  const conTornillo = ZONAS.filter((z) => z.tipo === 'placa' || z.id === 'chipset');
  const tornillos = new InstancedMesh(new CylinderGeometry(1.6, 1.6, 1.2, 12), m.acero, conTornillo.length * 2);
  tornillos.frustumCulled = false;
  let nt = 0;
  for (const z of conTornillo) {
    for (const lado of [-1, 1]) {
      molde.position.set(z.x + lado * (z.an / 2 - 3), z.al + 0.4, z.z);
      molde.rotation.set(0, 0, 0);
      molde.scale.set(1, 1, 1);
      molde.updateMatrix();
      tornillos.setMatrixAt(nt++, molde.matrix);
    }
  }
  tornillos.instanceMatrix.needsUpdate = true;
  g.add(tornillos);

  const PETALOS = 6;
  const RADIO_PETALO = 1.35;
  const AGUJEROS = taladros();
  const petalos = new InstancedMesh(new BoxGeometry(1, 1, 1), m.acero, AGUJEROS.length * PETALOS);
  petalos.frustumCulled = false;
  let ne = 0;
  for (const t of AGUJEROS) {
    for (let k = 0; k < PETALOS; k++) {
      const a = (k / PETALOS) * Math.PI * 2;
      molde.position.set(t.x + Math.cos(a) * RADIO_PETALO, 0.45, t.z + Math.sin(a) * RADIO_PETALO);
      molde.rotation.set(0, -a, 0);
      molde.scale.set(0.62, 0.34, 1.0);
      molde.updateMatrix();
      petalos.setMatrixAt(ne++, molde.matrix);
    }
  }
  petalos.instanceMatrix.needsUpdate = true;
  g.add(petalos);

  const arandelas = new InstancedMesh(new CylinderGeometry(1.95, 1.95, 0.26, 20), m.contacto, AGUJEROS.length);
  arandelas.frustumCulled = false;
  AGUJEROS.forEach((t, i) => {
    molde.position.set(t.x, 0.18, t.z);
    molde.rotation.set(0, 0, 0);
    molde.scale.set(1, 1, 1);
    molde.updateMatrix();
    arandelas.setMatrixAt(i, molde.matrix);
  });
  arandelas.instanceMatrix.needsUpdate = true;
  g.add(arandelas);

  const canto = new Mesh(new BoxGeometry(244, GROSOR, 244), m.sustrato);
  canto.position.y = -GROSOR / 2;
  g.add(canto);

  return g;
}
