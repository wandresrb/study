import {
  BOBINAS,
  CABECERAS,
  CONDENSADORES,
  DIODOS,
  INDUCTORES,
  MEDIO,
  PASO_PIN_CABECERA,
  MEDIA_BOBINA,
  PILA,
  RADIO_CONDENSADOR,
  RADIO_TALADRO,
  TALADROS_IDEALES,
  ZONAS,
  huella,
} from './layout';
import { reservaBuses } from './trazas';

export interface Taladro {
  x: number;
  z: number;
  desvio: number;
}

function chocaConPieza(x: number, z: number, r: number): boolean {
  for (const s of ZONAS) {
    if (s.tipo === 'bloque') continue;
    const h = huella(s);
    if (Math.abs(x - h.x) < h.an / 2 + r && Math.abs(z - h.z) < h.pr / 2 + r) return true;
  }
  for (const c of CABECERAS) {
    const ancho = c.pines * PASO_PIN_CABECERA;
    if (
      Math.abs(x - (c.x + ancho / 2 - PASO_PIN_CABECERA / 2)) < ancho / 2 + r &&
      Math.abs(z - c.z) < PASO_PIN_CABECERA + r
    ) {
      return true;
    }
  }
  for (const b of BOBINAS) {
    if (Math.abs(x - b.x) < MEDIA_BOBINA + r && Math.abs(z - b.z) < MEDIA_BOBINA + r) return true;
  }
  for (const c of CONDENSADORES) {
    if ((x - c.x) ** 2 + (z - c.z) ** 2 < (RADIO_CONDENSADOR + r) ** 2) return true;
  }
  for (const b of INDUCTORES) {
    if (Math.abs(x - b.x) < 4 + r && Math.abs(z - b.z) < 4 + r) return true;
  }
  for (const d of DIODOS) {
    if (Math.abs(x - d.x) < 4.5 + r && Math.abs(z - d.z) < 4.5 + r) return true;
  }
  if ((x - PILA.x) ** 2 + (z - PILA.z) ** 2 < (PILA.r + r) ** 2) return true;
  return false;
}

let cache: Taladro[] | null = null;

export function taladros(): Taladro[] {
  if (cache) return cache;

  const sobreBus = reservaBuses(0);
  const chocaConBus = (x: number, z: number, r: number) => {
    if (sobreBus(x, z)) return true;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      for (const k of [1, 0.7, 0.4]) {
        if (sobreBus(x + Math.cos(a) * r * k, z + Math.sin(a) * r * k)) return true;
      }
    }
    return false;
  };

  const libre = (x: number, z: number) => {
    if (Math.abs(x) > MEDIO - RADIO_TALADRO - 2) return false;
    if (Math.abs(z) > MEDIO - RADIO_TALADRO - 2) return false;
    if (chocaConPieza(x, z, RADIO_TALADRO)) return false;
    if (chocaConBus(x, z, RADIO_TALADRO)) return false;
    return true;
  };

  const out: Taladro[] = [];
  for (const ideal of TALADROS_IDEALES) {
    let puesto: Taladro | null = null;

    for (let r = 0; r <= 14 && !puesto; r += 2) {
      const pasos = r === 0 ? 1 : Math.max(8, Math.round((r * Math.PI * 2) / 2));
      for (let i = 0; i < pasos; i++) {
        const a = (i / pasos) * Math.PI * 2;
        const x = ideal.x + Math.cos(a) * r;
        const z = ideal.z + Math.sin(a) * r;
        if (!libre(x, z)) continue;
        if (out.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < (RADIO_TALADRO * 2.4) ** 2)) continue;
        puesto = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, desvio: r };
        break;
      }
    }

    if (puesto) out.push(puesto);
  }

  cache = out;
  return out;
}

export function enTaladro(x: number, z: number, margen = 0): boolean {
  for (const t of taladros()) {
    if ((x - t.x) ** 2 + (z - t.z) ** 2 < (RADIO_TALADRO + margen) ** 2) return true;
  }
  return false;
}
