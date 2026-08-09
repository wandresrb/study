// Capa 01 — el suelo.
//
// La portada arranca siendo una placa y el scroll la convierte en la primera
// capa: una losa finita, casi plana, con todo el hueco libre encima para lo que
// venga después. Aquí no hay ninguna capa encima todavía.
//
// Cumple el contrato de `../escena`: recibe un avance de 0 a 1 y no sabe nada
// del scroll. Quien decide cuándo montarla y cuándo soltarla es la página.

import gsap from 'gsap';

import type { Escena } from '../escena';
import { construir } from './placa';
import { motor } from './render';
import { rig } from './rig';

/** Fotograma único que se compone cuando se pide movimiento reducido. */
const REPOSO = 0.72;

export async function montar(host: HTMLElement): Promise<Escena> {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // `?gl=1` fuerza el camino de respaldo. Un fallback sin probar es un fallback
  // que no existe, y con esto se prueba en el navegador real.
  const forzarGL = new URLSearchParams(window.location.search).has('gl');

  const r = rig();
  const m = await motor(host, forzarGL, (w, h) => r.redimensionar(w, h));
  const placa = construir(m.renderer);

  host.dataset.backend = m.backend;

  const estado = { p: reducido ? REPOSO : 0, intro: reducido ? 1 : 0 };
  const arranque = performance.now();

  const componer = (t: number) => {
    r.aplicar(estado.p, estado.intro);
    placa.animar(t, estado.intro);
    m.renderer.render(placa.escena, r.camara);
  };

  let vivo = true;
  let raf = 0;

  if (reducido) {
    // Un solo fotograma y punto. Es lo que pide esa preferencia: la escena
    // compuesta, sin recorrido y sin bucle de animación.
    componer(0);
  } else {
    gsap.to(estado, { intro: 1, duration: 2.6, ease: 'power2.out' });
    const cuadro = () => {
      if (!vivo) return;
      raf = requestAnimationFrame(cuadro);
      componer((performance.now() - arranque) / 1000);
    };
    raf = requestAnimationFrame(cuadro);
  }

  return {
    avance(p) {
      if (reducido) return;
      // La inercia va aquí, no en el scroll. El valor crudo salta; este tween
      // le da la masa que al movimiento anterior le faltaba.
      gsap.to(estado, { p, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    },

    destruir() {
      vivo = false;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(estado);
      delete host.dataset.backend;
      placa.soltar();
      m.soltar();
    },
  };
}
