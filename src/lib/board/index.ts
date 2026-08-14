import gsap from 'gsap';

import { FIN, type Escena } from '../escena';
import { construir } from './placa';
import { motor } from './render';
import { rig } from './rig';

const REPOSO = 0.72;

const HUNDE = [FIN, 0.94] as const;

const suave = (t: number) => t * t * (3 - 2 * t);
const franja = (p: number, a: number, b: number) =>
  suave(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface EscenaPlaca extends Escena {
  arrancar(): void;
  reiniciar(): void;
}

export async function montar(host: HTMLElement): Promise<EscenaPlaca> {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forzarGL = new URLSearchParams(window.location.search).has('gl');

  const r = rig();
  const m = await motor(host, forzarGL, (w, h) => r.redimensionar(w, h));
  const placa = construir(m.renderer);

  host.dataset.backend = m.backend;

  const estado = { p: reducido ? REPOSO : 0, intro: reducido ? 1 : 0 };
  const arranque = performance.now();

  let cuadros = 0;
  let fallo = false;
  let arrancado = reducido;

  const componer = (t: number) => {
    try {
      const camara = Math.min(1, estado.p / FIN);
      const hundido = franja(estado.p, HUNDE[0], HUNDE[1]);

      const hayMaquina = arrancado && hundido < 0.999;
      if (hayMaquina) {
        r.aplicar(camara, estado.intro);
        placa.componer(camara, hundido);
        placa.animar(t, estado.intro);
        m.renderer.render(placa.escena, r.camara);
      } else {
        m.renderer.clear();
      }

      m.mostrar();
      cuadros++;
      if (import.meta.env.DEV && cuadros % 30 === 1) host.dataset.cuadros = String(cuadros);
    } catch (err) {
      if (!fallo) {
        fallo = true;
        host.dataset.fallo = String((err as Error)?.message ?? err);
        console.error('[placa] el bucle no puede componer:', err);
      }
    }
  };

  let vivo = true;
  let raf = 0;

  if (reducido) {
    componer(0);
  } else {
    const cuadro = () => {
      if (!vivo) return;
      raf = requestAnimationFrame(cuadro);
      componer((performance.now() - arranque) / 1000);
    };
    raf = requestAnimationFrame(cuadro);
  }

  return {
    reiniciar() {
      arrancado = false;
      gsap.killTweensOf(estado);
      estado.p = 0;
      estado.intro = 0;
    },

    arrancar() {
      if (arrancado || !vivo) return;
      arrancado = true;
      gsap.to(estado, { intro: 1, duration: 2.2, ease: 'power2.out' });
    },

    avance(p) {
      if (reducido || !vivo) return;
      gsap.to(estado, { p, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    },

    destruir() {
      vivo = false;
      cancelAnimationFrame(raf);
      gsap.killTweensOf(estado);
      delete host.dataset.backend;
      delete host.dataset.cuadros;
      placa.soltar();
      m.soltar();
    },
  };
}
