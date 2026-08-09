// Lo que sobresale de la placa.
//
// La silueta es la mitad de la identidad de una placa: disipadores con aletas,
// cuatro ranuras de memoria en paralelo, la carcasa del panel trasero, el marco
// del socket. Sin volumen, por muy bien dibujada que esté la máscara, sigue
// pareciendo un diagrama.
//
// Todo lo repetido va instanciado. El presupuesto de llamadas de dibujo es de
// una decena para la placa entera.

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
  azar,
  BOBINAS,
  CABECERAS,
  CONDENSADORES,
  DIODOS,
  INDUCTORES,
  RADIO_CONDENSADOR,
  GROSOR,
  PASO_PIN_CABECERA,
  PILA,
  RADIO_TALADRO,
  ZONAS,
  type Zona,
  fisico,
} from './layout';
import { taladros } from './agujeros';
import { procesador } from './procesador';
import { HUELLAS, type Pieza } from './siembra';

export interface Materiales {
  sustrato: MeshStandardNodeMaterial;
  aluminio: MeshStandardNodeMaterial;
  plastico: MeshStandardNodeMaterial;
  contacto: MeshStandardNodeMaterial;
  /** El interior oscuro de un conector. */
  canal: MeshStandardNodeMaterial;
  cuerpo: MeshStandardNodeMaterial;
  acento: MeshStandardNodeMaterial;
  /** Chapa de acero: la placa de retención y la palanca del socket. */
  acero: MeshStandardNodeMaterial;
  /** La trama fina del fondo del socket. */
  contactoFino: MeshStandardNodeMaterial;
}

const molde = new Object3D();

/** Un disipador: bloque con aletas. Las aletas van instanciadas. */
function disipador(s: Zona, m: Materiales): Group {
  const g = new Group();
  const base = new Mesh(new BoxGeometry(s.an, s.al * 0.34, s.pr), m.aluminio);
  base.position.set(s.x, (s.al * 0.34) / 2, s.z);
  g.add(base);

  // Las aletas corren a lo largo del lado más corto.
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

/**
 * Una ranura.
 *
 * La clave es que el hueco tiene que ser un hueco DE VERDAD: dos paredes
 * separadas, no un canal metido dentro de una caja maciza. Con la caja maciza
 * —que es lo que había— el canal queda enterrado y la ranura se ve como un
 * tocho liso: no hay ranura que ver.
 *
 * Se construye con el eje largo en Z y se gira al final si el conector va
 * atravesado.
 */
function ranura(s: Zona, m: Materiales): Group {
  const g = new Group();
  const alLargo = s.pr > s.an;
  const largo = alLargo ? s.pr : s.an;
  const ancho = alLargo ? s.an : s.pr;
  const alto = s.al;

  const cuerpo = new Group();

  // Las dos paredes. Entre ellas queda el hueco.
  const pared = ancho * 0.3;
  const hueco = ancho - pared * 2;
  for (const lado of [-1, 1]) {
    const w = new Mesh(new BoxGeometry(pared, alto, largo), m.plastico);
    w.position.set(lado * (ancho / 2 - pared / 2), alto / 2, 0);
    cuerpo.add(w);
  }

  // Tapas en los extremos: cierran el hueco por los cantos.
  for (const lado of [-1, 1]) {
    const c = new Mesh(new BoxGeometry(ancho, alto, pared), m.plastico);
    c.position.set(0, alto / 2, lado * (largo / 2 - pared / 2));
    cuerpo.add(c);
  }

  // Fondo del hueco, oscuro y hundido.
  const fondo = new Mesh(new BoxGeometry(hueco, alto * 0.3, largo - pared * 2), m.canal);
  fondo.position.set(0, alto * 0.15, 0);
  cuerpo.add(fondo);

  // La muesca de polarización: el tabique que parte el hueco en dos tramos
  // desiguales, y que impide meter el módulo del revés.
  const MUESCA: Record<string, number> = { pcie16: 0.17, pcie1: 0.26, atx: 0.5 };
  const f = MUESCA[s.id] ?? 0.44;
  const tabique = new Mesh(new BoxGeometry(hueco, alto * 0.72, 2.2), m.contacto);
  tabique.position.set(0, alto * 0.36, (f - 0.5) * largo);
  cuerpo.add(tabique);

  // Las palancas: cuerpo bajo, brazo levantado y pestaña de agarre arriba, más
  // ancha. Ese escalonado es lo que se reconoce de una hilera de ranuras.
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

  // Refuerzo de la ranura larga de expansión. NO es aluminio: una ranura PCI es
  // plástico, y con material metálico salían dos barras gris claro que se
  // llevaban la mirada de toda esa mitad de la placa.
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

/** Todo lo que se levanta sobre el sustrato. */
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
        // Las tapas M.2 tampoco son de aluminio claro: en la referencia son
        // negras. El aluminio se queda solo para los disipadores.
        const p = new Mesh(new BoxGeometry(s.an, s.al, s.pr), m.cuerpo);
        p.position.set(s.x, s.al / 2, s.z);
        g.add(p);
        break;
      }
    }
  }

  // --- Componente pequeño ---------------------------------------------------
  // La colocación vive en `siembra.ts` y llega ya resuelta: la textura y la
  // geometría tienen que sembrar exactamente lo mismo, o los pads no caen bajo
  // las piezas.
  // Una de cada cinco piezas va en metal. En una placa real hay muchísimo
  // componente pequeño con cuerpo metálico —tántalos, latas, bobinas
  // apantalladas— y son ellos los que dan el destello que impide que la placa
  // se lea como una plancha negra. Sin eso hay que subir la exposición, y subir
  // la exposición es lo que la lavaba.
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

  // Los terminales. Un pasivo de placa es un cuerpo oscuro con dos casquillos
  // metálicos en las puntas, y ese contraste es lo único que lo hace legible
  // como resistencia a cualquier distancia: sin él son cajitas.
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

  // --- Bobinas de alimentación ---------------------------------------------
  // En fila, iguales y pegadas al disipador. Es de los rasgos que más dicen
  // "placa" de un vistazo.
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

  // Tapa metálica de cada bobina: es lo que más brilla de la zona del VRM.
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

  // --- Condensadores electrolíticos ----------------------------------------
  // Pocos, iguales y donde van de verdad: junto a la alimentación. Antes eran
  // veintiséis repartidos por toda la placa, con diez caras cada uno — se les
  // veían las aristas y no parecían cilindros.
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

  // --- Contactos de las ranuras --------------------------------------------
  // El peine que se ve al asomarse a una ranura. Van todos en una malla: son
  // más de mil, y sin instanciar serían mil llamadas de dibujo.
  // Paso real: 0,85 mm en memoria y expansión. Con el 1,3 que había antes el
  // peine se leía como una cremallera gruesa; a paso real es la trama fina que
  // se ve en una placa.
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
        // Pegados a la pared interior, dentro del hueco.
        const off = lado * ancho * 0.16;
        molde.position.set(
          z.x + (alLargo ? off : t),
          z.al * 0.6,
          z.z + (alLargo ? t : off),
        );
        molde.rotation.set(0, 0, 0);
        // Finas y bajas: en una placa los contactos son ranuras en el
        // plástico, no cuentas de collar.
        molde.scale.set(alLargo ? 0.36 : 0.44, z.al * 0.36, alLargo ? 0.44 : 0.36);
        molde.updateMatrix();
        contactos.setMatrixAt(ncon++, molde.matrix);
      }
    }
  }
  contactos.count = ncon;
  contactos.instanceMatrix.needsUpdate = true;
  g.add(contactos);

  // --- Cabeceras de pines ---------------------------------------------------
  // Dos hileras de contactos cuadrados a paso fijo, en grupos separados a lo
  // largo del borde inferior. Es de lo más reconocible de esa mitad de la
  // placa, y no es dispersión: es repetición exacta.
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

  // --- Pila de botón --------------------------------------------------------
  const pila = new Mesh(new CylinderGeometry(PILA.r, PILA.r, 3.2, 28), m.acero);
  pila.position.set(PILA.x, 1.6, PILA.z);
  g.add(pila);
  const cuna = new Mesh(new BoxGeometry(PILA.r * 2.3, 1.4, PILA.r * 1.5), m.plastico);
  cuna.position.set(PILA.x, 0.7, PILA.z);
  g.add(cuna);
  // La pinza que la sujeta por un costado.
  const pinza = new Mesh(new BoxGeometry(3, 4.4, 6), m.acero);
  pinza.position.set(PILA.x + PILA.r + 1.4, 2.2, PILA.z);
  g.add(pinza);

  // --- Tornillos de los disipadores ----------------------------------------
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

  // --- Taladros de montaje --------------------------------------------------
  // Anillo metálico y arandela de estrella. Es un detalle pequeño, pero los
  // nueve taladros están repartidos por toda la placa y sin él se leen como
  // agujeros pintados.
  // Seis pétalos en corona alrededor del agujero, no barras cruzadas: una
  // arandela de estrella es eso, chapa recortada en pétalos. Y va pequeña — el
  // círculo desnudo que la rodea es cuatro veces más ancho que ella.
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

  // El canto del sustrato. Es lo que convierte la placa en un objeto con
  // grosor —una losa— en vez de en un plano, y de eso depende que más adelante
  // se lea como la primera capa de una pila.
  const canto = new Mesh(new BoxGeometry(244, GROSOR, 244), m.sustrato);
  canto.position.y = -GROSOR / 2;
  g.add(canto);

  return g;
}
