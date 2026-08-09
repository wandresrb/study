// La capa de hardware, de principio a fin y en un solo lienzo.
//
// Dos fases:
//
//   · hasta `FIN` — la cámara recorre la placa y se monta la máquina: primero
//     el volumen, luego los aparatos y la señal saliendo por los puertos;
//   · a partir de ahí — la máquina se va al suelo de la pantalla y entra la
//     barra de la pila. La cámara ya no se mueve.
//
// Las dos cosas van EN EL MISMO LIENZO. Hubo una versión con la barra en HTML
// por encima y funcionaba, pero obligaba a sincronizar dos cosas distintas
// —cuánto se apaga una, cuánto entra la otra, dónde aterriza cada una— y el
// relevo se notaba. Aquí no hay nada que sincronizar.
//
// La PILA ya no se dibuja aquí. Pasó a ser DOM porque es la navegación del
// sitio, y una textura en un lienzo no recibe foco con Tab, no se anuncia a un
// lector de pantalla y no tiene área de pulsación. Eso no es cuestión de
// estilo: es el suelo de accesibilidad de cualquier control.

import gsap from 'gsap';

import type { Escena } from '../escena';
import { construir } from './placa';
import { motor } from './render';
import { rig } from './rig';

/** Fotograma único que se compone cuando se pide movimiento reducido. */
const REPOSO = 0.72;

/**
 * Las dos fases del recorrido, en avance de scroll.
 *
 * Hasta `FIN` se mueve la cámara y se monta la máquina. A partir de ahí la
 * cámara se queda quieta y lo único que pasa es la transformación en pila:
 * la máquina se va al suelo y entra la barra. Van separadas porque compartiendo
 * tramo pasaban dos cosas a la vez y no daba tiempo a leer ninguna.
 */
const FIN = 0.72;
const HUNDE = [0.72, 0.94] as const;

const suave = (t: number) => t * t * (3 - 2 * t);
const franja = (p: number, a: number, b: number) =>
  suave(Math.min(1, Math.max(0, (p - a) / (b - a))));

export interface EscenaPlaca extends Escena {
  /**
   * Enciende la máquina. Antes de esto solo se dibuja la pila vacía — ni un
   * triángulo de la placa, ni una sombra. La pantalla de inicio es texto, un
   * editor y un hueco reservado; no tiene por qué costar una escena entera.
   */
  arrancar(): void;
  /** Vuelve al punto de partida. Lo llama el `pop` de la pila. */
  reiniciar(): void;
}

export async function montar(host: HTMLElement): Promise<EscenaPlaca> {
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

  let cuadros = 0;
  let fallo = false;
  let arrancado = reducido;

  const componer = (t: number) => {
    // Una excepción aquí dentro es invisible: el siguiente fotograma ya está
    // pedido antes de llamar, así que el bucle sigue girando y fallando en
    // silencio, sin escena y sin nada en consola. Se registra una vez.
    try {
      // El avance que llega es el del scroll entero. Aquí se reparte: la cámara
      // consume hasta `FIN` y la transformación en pila lo que queda.
      const camara = Math.min(1, estado.p / FIN);
      const hundido = franja(estado.p, HUNDE[0], HUNDE[1]);

      // Antes de arrancar, y cuando la máquina ya se ha ido del todo, no hay
      // nada que dibujar de ella: se salta la escena entera. Eso es lo que
      // quita el tirón del final —antes se seguía pagando placa, aparatos y
      // sombras para no ver nada— y lo que hace que la pantalla de inicio no
      // cueste un fotograma completo de 3D.
      const hayMaquina = arrancado && hundido < 0.999;
      if (hayMaquina) {
        r.aplicar(camara, estado.intro);
        // El mismo avance que mueve la cámara le hace crecer el canto: el filo
        // y el encuadre tienen que ir a la vez o el grosor aparece de la nada.
        placa.componer(camara, hundido);
        placa.animar(t, estado.intro);
        m.renderer.render(placa.escena, r.camara);
      } else {
        m.renderer.clear();
      }

      // Solo después de que haya algo dibujado.
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
    // Un solo fotograma y punto. Es lo que pide esa preferencia.
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
      // La entrada de cámara empieza AQUÍ y no al montar: si arrancara con la
      // página, para cuando alguien pulsa Run ya se habría consumido y la
      // máquina aparecería de golpe, sin llegada.
      gsap.to(estado, { intro: 1, duration: 2.2, ease: 'power2.out' });
    },

    avance(p) {
      if (reducido || !vivo) return;
      // La inercia va aquí, no en el scroll. El valor crudo salta; este tween
      // le da la masa que al movimiento anterior le faltaba, y es lo que hace
      // que el recorrido se sienta continuo en vez de a tirones.
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
