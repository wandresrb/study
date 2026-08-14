// Progreso, racha y repaso espaciado de los drills. Todo en localStorage:
// el sitio es estático y el progreso es del lector, no nuestro.
//
// El dojo reproduce drills sin visitar su lección, así que al completar uno
// se guarda su definición completa — el SRS solo repasa lo ya practicado,
// que es exactamente lo que significa repasar.

import type { DefDrill } from './drill-engine';

const CLAVE = 'nvdios:v1';

/** Intervalos del repaso, en días. Fallar retrocede un escalón. */
const INTERVALOS = [1, 3, 7, 21];

export interface RegistroDrill {
  def: DefDrill;
  reto: string;
  leccion: string;
  /** 0 = hecho · 1 = sin pista · 2 = dentro del presupuesto */
  dominio: 0 | 1 | 2;
  intentos: number;
  fallos: number;
  /** escalón actual en INTERVALOS y fecha (epoch días) del próximo repaso */
  escalon: number;
  repasoEn: number;
}

interface Estado {
  drills: Record<string, RegistroDrill>;
  /** días (epoch día) con práctica, para la racha */
  dias: number[];
}

const hoy = () => Math.floor(Date.now() / 86_400_000);

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) return JSON.parse(crudo) as Estado;
  } catch {
    /* corrupto o sin permiso: se empieza de cero */
  }
  return { drills: {}, dias: [] };
}

function escribir(estado: Estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    /* sin sitio o modo privado: el drill funciona igual, sin memoria */
  }
}

export function estadoDrill(id: string): RegistroDrill | undefined {
  return leer().drills[id];
}

export function completarDrill(
  id: string,
  datos: { def: DefDrill; reto: string; leccion: string; sinPista: boolean; enPresupuesto: boolean },
) {
  const estado = leer();
  const previo = estado.drills[id];
  const dominio = datos.enPresupuesto ? 2 : datos.sinPista ? 1 : 0;
  const escalon = previo ? Math.min(previo.escalon + 1, INTERVALOS.length - 1) : 0;
  estado.drills[id] = {
    def: datos.def,
    reto: datos.reto,
    leccion: datos.leccion,
    dominio: Math.max(previo?.dominio ?? 0, dominio) as 0 | 1 | 2,
    intentos: (previo?.intentos ?? 0) + 1,
    fallos: previo?.fallos ?? 0,
    escalon,
    repasoEn: hoy() + INTERVALOS[escalon],
  };
  if (!estado.dias.includes(hoy())) estado.dias.push(hoy());
  escribir(estado);
}

export function fallarDrill(id: string) {
  const estado = leer();
  const r = estado.drills[id];
  if (!r) return; // solo cuenta fallos de drills ya conocidos (repasos)
  r.fallos += 1;
  r.escalon = Math.max(0, r.escalon - 1);
  r.repasoEn = hoy() + INTERVALOS[r.escalon];
  escribir(estado);
}

/** Los repasos vencidos, los más atrasados primero. */
export function repasosVencidos(): Array<{ id: string } & RegistroDrill> {
  const { drills } = leer();
  return Object.entries(drills)
    .filter(([, r]) => r.repasoEn <= hoy())
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => a.repasoEn - b.repasoEn);
}

/** Días seguidos de práctica terminando hoy o ayer. */
export function racha(): number {
  const dias = new Set(leer().dias);
  let d = dias.has(hoy()) ? hoy() : hoy() - 1;
  let n = 0;
  while (dias.has(d)) {
    n += 1;
    d -= 1;
  }
  return n;
}

/** hechos/total por lección, para los ticks de la barra lateral. */
export function porLeccion(): Map<string, { hechos: number; dominados: number }> {
  const mapa = new Map<string, { hechos: number; dominados: number }>();
  for (const r of Object.values(leer().drills)) {
    const acc = mapa.get(r.leccion) ?? { hechos: 0, dominados: 0 };
    acc.hechos += 1;
    if (r.dominio >= 1) acc.dominados += 1;
    mapa.set(r.leccion, acc);
  }
  return mapa;
}

export function estadisticas() {
  const { drills } = leer();
  const valores = Object.values(drills);
  return {
    total: valores.length,
    dominados: valores.filter((r) => r.dominio >= 1).length,
    intentos: valores.reduce((s, r) => s + r.intentos, 0),
    fallos: valores.reduce((s, r) => s + r.fallos, 0),
    debiles: Object.entries(drills)
      .filter(([, r]) => r.fallos > 0)
      .sort((a, b) => b[1].fallos - a[1].fallos)
      .slice(0, 8)
      .map(([id, r]) => ({ id, reto: r.reto, fallos: r.fallos, leccion: r.leccion })),
  };
}

/** Exportar/importar: el único «backend» es un JSON que el lector se lleva. */
export const exportar = () => localStorage.getItem(CLAVE) ?? '{}';
export function importar(json: string) {
  JSON.parse(json); // valida antes de pisar
  localStorage.setItem(CLAVE, json);
}
