// Capa 06 — el modelo de la escena distribuida.
//
// Los tres fenómenos no son tres escenas: son la misma simulación en tres
// estados. Aquí vive lo que comparten el respaldo en lienzo y la versión de
// GPU: cómo se genera la topología y qué significa cada fase.

/** Las cuatro fases, en el orden en que las encuentra quien baja. */
export const FASES = [
  { id: 'latencia', nombre: 'Espacio de latencia', hasta: 0.3 },
  { id: 'propagacion', nombre: 'Propagación', hasta: 0.62 },
  { id: 'particion', nombre: 'Partición', hasta: 0.88 },
  { id: 'reconciliacion', nombre: 'Reconciliación', hasta: 1.01 },
] as const;

export function faseDe(p: number): number {
  for (let i = 0; i < FASES.length; i++) if (p < FASES[i].hasta) return i;
  return FASES.length - 1;
}

export interface Topologia {
  n: number;
  k: number;
  /** Posiciones, 2 por nodo. */
  pos: Float32Array;
  vel: Float32Array;
  /** Versión que conoce cada nodo. 0 = ninguna. */
  ver: Uint32Array;
  /** A qué lado del corte cae el nodo. */
  lado: Uint8Array;
  /** Vecinos: k índices por nodo. */
  nb: Int32Array;
  /** Latencia de cada arista, en segundos de viaje. */
  lat: Float32Array;
  /** Avance del mensaje en tránsito por cada arista, de 0 a 1. */
  prog: Float32Array;
  /** Un nodo semilla en cada lado del corte. */
  semillas: [number, number];
}

/**
 * Genera la topología.
 *
 * Los nodos se agrupan en regiones. Dentro de una región se hablan rápido;
 * entre regiones, lento. El grafo se construye sobre eso, y la latencia de cada
 * arista es su longitud de reposo: cuando el sistema se relaja, lo que se ve no
 * es dónde están las máquinas sino cuánto tardan en hablarse.
 */
export function generar(n: number, k: number, regiones = 6): Topologia {
  const pos = new Float32Array(n * 2);
  const vel = new Float32Array(n * 2);
  const ver = new Uint32Array(n);
  const lado = new Uint8Array(n);
  const nb = new Int32Array(n * k);
  const lat = new Float32Array(n * k);
  const prog = new Float32Array(n * k);

  // Generador propio: la topología tiene que ser la misma en cada carga.
  let s = 0x9e3779b9;
  const rnd = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };

  const region = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = (i * regiones / n) | 0;
    region[i] = r;
    // El corte parte el mundo por regiones, no por geometría: una partición de
    // red separa centros, no puntos de un plano.
    lado[i] = r < regiones / 2 ? 0 : 1;
    const ang = (r / regiones) * Math.PI * 2 + (rnd() - 0.5) * 0.9;
    const rad = 0.35 + rnd() * 0.3;
    pos[i * 2] = Math.cos(ang) * rad + (rnd() - 0.5) * 0.12;
    pos[i * 2 + 1] = Math.sin(ang) * rad + (rnd() - 0.5) * 0.12;
  }

  for (let i = 0; i < n; i++) {
    for (let e = 0; e < k; e++) {
      // La mayoría de enlaces son dentro de la región; uno de cada k sale
      // fuera. Son los enlaces largos los que hacen que el sistema converja, y
      // también los primeros que se pierden en una partición.
      let j: number;
      let cerca: boolean;
      if (e < k - 1) {
        cerca = true;
        const base = ((region[i] * n) / regiones) | 0;
        const tam = (n / regiones) | 0;
        j = base + ((rnd() * tam) | 0);
      } else {
        cerca = false;
        j = (rnd() * n) | 0;
      }
      if (j === i) j = (i + 1) % n;
      nb[i * k + e] = j;
      // Latencia en segundos: dentro de la región, milisegundos; fuera, un
      // orden de magnitud más.
      lat[i * k + e] = cerca ? 0.25 + rnd() * 0.25 : 1.2 + rnd() * 1.0;
    }
  }

  // Una semilla por lado, lo más lejos posible una de otra.
  let a = 0;
  let b = n - 1;
  for (let i = 0; i < n; i++) if (lado[i] === 0) { a = i; break; }
  for (let i = n - 1; i >= 0; i--) if (lado[i] === 1) { b = i; break; }

  return { n, k, pos, vel, ver, lado, nb, lat, prog, semillas: [a, b] };
}

/** Aplica el estado de una fase. Es lo único que cambia al mover el scroll. */
export function aplicarFase(t: Topologia, fase: number): void {
  t.ver.fill(0);
  t.prog.fill(0);
  if (fase >= 1) t.ver[t.semillas[0]] = 1;
  if (fase >= 2) {
    // Dos escrituras a la vez, una en cada mitad, con el corte activo. El
    // sistema queda con dos verdades y cada mitad convencida de la suya.
    t.ver[t.semillas[0]] = 2;
    t.ver[t.semillas[1]] = 3;
  }
}

/** ¿Está cortada la red en esta fase? */
export function hayCorte(fase: number): boolean {
  return fase === 2;
}

/**
 * Un paso de la simulación en CPU.
 *
 * Dos cosas en el mismo bucle: la relajación hacia el espacio de latencia, que
 * está siempre activa, y el chisme entre vecinos, que es lo que propaga.
 */
export function paso(t: Topologia, dt: number, corte: boolean): void {
  const { n, k, pos, vel, ver, lado, nb, lat, prog } = t;

  for (let i = 0; i < n; i++) {
    let fx = 0;
    let fy = 0;
    const xi = pos[i * 2];
    const yi = pos[i * 2 + 1];

    for (let e = 0; e < k; e++) {
      const o = i * k + e;
      const j = nb[o];
      const dx = pos[j * 2] - xi;
      const dy = pos[j * 2 + 1] - yi;
      const d = Math.hypot(dx, dy) || 1e-4;
      // Longitud de reposo proporcional a la latencia: los que se hablan rápido
      // se juntan, los lentos se separan.
      const reposo = lat[o] * 0.22;
      const f = (d - reposo) * 1.6;
      fx += (dx / d) * f;
      fy += (dy / d) * f;

      // Repulsión corta, para que no colapsen unos sobre otros.
      if (d < 0.05) {
        fx -= (dx / d) * (0.05 - d) * 6;
        fy -= (dy / d) * (0.05 - d) * 6;
      }

      // El chisme. Si el vecino sabe algo más nuevo, el mensaje viaja; cuando
      // llega, se adopta. Y si el corte lo separa de mí, el mensaje se pierde:
      // ese único `if` es lo que convierte la propagación en desacuerdo.
      const cruza = corte && lado[i] !== lado[j];
      if (!cruza && ver[j] > ver[i]) {
        prog[o] += dt / lat[o];
        if (prog[o] >= 1) {
          ver[i] = ver[j];
          prog[o] = 0;
        }
      } else if (prog[o] > 0) {
        prog[o] = Math.max(0, prog[o] - dt * 2);
      }
    }

    // Un tirón suave al centro, para que el conjunto no se vaya a la deriva.
    fx -= xi * 0.35;
    fy -= yi * 0.35;

    vel[i * 2] = (vel[i * 2] + fx * dt) * 0.86;
    vel[i * 2 + 1] = (vel[i * 2 + 1] + fy * dt) * 0.86;
    pos[i * 2] = xi + vel[i * 2] * dt;
    pos[i * 2 + 1] = yi + vel[i * 2 + 1] * dt;
  }
}
