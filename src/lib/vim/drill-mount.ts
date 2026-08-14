// Monta los drills interactivos de la página. Este módulo es ligero y se
// carga siempre; el motor (CM6 + vim, ~90 KB) solo se descarga cuando el
// primer drill entra en pantalla, y una sola vez por sesión de navegación.
//
// Con <ClientRouter/> los módulos corren UNA vez: todo cuelga de
// astro:page-load y es idempotente (data-montado marca lo ya hecho).

import { completarDrill, estadoDrill, porLeccion } from './progreso';
import { lessonIdOf, markRead } from '../progress';
import type { DefDrill, Drill } from './drill-engine';

type Motor = typeof import('./drill-engine');
let motor: Promise<Motor> | null = null;
const cargarMotor = () => (motor ??= import('./drill-engine'));

const vivos = new WeakMap<HTMLElement, Drill>();

function montarUno(raiz: HTMLElement, api: Motor) {
  const def = JSON.parse(raiz.querySelector('script[type="application/json"]')!.textContent!) as DefDrill;
  const id = raiz.dataset.id!;
  const reto = raiz.dataset.reto ?? '';
  const term = raiz.querySelector<HTMLElement>('[data-term]')!;
  term.querySelector('pre')?.remove(); // el fallback SSR: el editor lo sustituye
  const modoEl = raiz.querySelector<HTMLElement>('[data-modo]')!;
  const hudEl = raiz.querySelector<HTMLElement>('[data-hud]')!;
  const estadoEl = raiz.querySelector<HTMLElement>('[data-estado]')!;
  const pistaEl = raiz.querySelector<HTMLElement>('[data-pista]');
  const explicaEl = raiz.querySelector<HTMLElement>('[data-explica]');

  let usoPista = false;

  const pintarEstado = (dominio: number | undefined) => {
    estadoEl.textContent = dominio === 2 ? '★' : dominio !== undefined ? '✓' : '○';
    estadoEl.className =
      'font-mono text-sm ' +
      (dominio === 2 ? 'text-yellow' : dominio !== undefined ? 'text-green' : 'text-overlay0');
  };
  pintarEstado(estadoDrill(id)?.dominio);

  const drill = api.montar(term, def, {
    onModo(modo) {
      const m = modo.toUpperCase();
      modoEl.textContent = m;
      modoEl.dataset.valor = modo.split(' ')[0];
    },
    onTecla(tecla, total) {
      if (!tecla) {
        hudEl.replaceChildren();
        return;
      }
      const chip = document.createElement('kbd');
      chip.className =
        'rounded-xs border border-borde bg-mantle px-1 font-mono text-2xs text-subtext1';
      chip.textContent = tecla;
      hudEl.append(chip);
      while (hudEl.childElementCount > 14) hudEl.firstElementChild!.remove();
      void total;
    },
    onExito({ pulsaciones }) {
      const enPresupuesto = def.presupuesto !== undefined && pulsaciones <= def.presupuesto;
      completarDrill(id, {
        def,
        reto,
        leccion: location.pathname,
        sinPista: !usoPista,
        enPresupuesto,
      });
      pintarEstado(estadoDrill(id)?.dominio);
      explicaEl?.removeAttribute('hidden');
      raiz.dispatchEvent(new CustomEvent('drill:exito', { bubbles: true }));
      celebrar(raiz, enPresupuesto);
      // practicar marca la lección: si todos los drills de la página están
      // hechos, cae el tick de leída del sistema de progreso del sitio
      const total = document.querySelectorAll('[data-vim-drill]').length;
      const hechos = porLeccion().get(location.pathname)?.hechos ?? 0;
      if (total > 0 && hechos >= total) void markRead(lessonIdOf(location.href));
    },
  });
  vivos.set(raiz, drill);
  // accesible desde el elemento: lo usan el dojo y las pruebas de navegador
  (raiz as HTMLElement & { drill?: Drill }).drill = drill;

  raiz.querySelector('[data-accion="reiniciar"]')?.addEventListener('click', () => {
    drill.reiniciar();
    drill.view.focus();
  });
  raiz.querySelector('[data-accion="pista"]')?.addEventListener('click', () => {
    usoPista = true;
    pistaEl?.toggleAttribute('hidden');
  });
  raiz.querySelector('[data-accion="solucion"]')?.addEventListener('click', () => {
    usoPista = true;
    explicaEl?.removeAttribute('hidden');
    void drill.reproducir();
  });

  // El overlay de «haz clic para practicar»: evita robar el teclado al scroll
  const velo = raiz.querySelector<HTMLElement>('[data-velo]');
  velo?.addEventListener('click', () => {
    velo.remove();
    drill.view.focus();
  });
}

/* Un acierto merece 200 ms de alegría, no confeti. GSAP ya está en el sitio
   (la portada lo usa); se trae bajo demanda para no pagarlo en cada página. */
async function celebrar(raiz: HTMLElement, estrella: boolean) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { gsap } = await import('gsap');
  const term = raiz.querySelector('[data-term]');
  gsap.fromTo(
    term,
    { boxShadow: `0 0 0 2px var(${estrella ? '--yellow' : '--green'})` },
    { boxShadow: '0 0 0 0px transparent', duration: 0.6, ease: 'power2.out' },
  );
  gsap.fromTo(
    raiz.querySelector('[data-estado]'),
    { scale: 1.6 },
    { scale: 1, duration: 0.35, ease: 'back.out(3)' },
  );
}

const montar = (el: HTMLElement) => {
  if (el.dataset.montado) return;
  el.dataset.montado = '1';
  cargarMotor().then((api) => montarUno(el, api));
};

/** Monta lo que haya sin montar. Exportada: el dojo inyecta drills y la llama. */
export function montarPendientes() {
  const drills = document.querySelectorAll<HTMLElement>('[data-vim-drill]:not([data-montado])');
  if (drills.length === 0) return;

  // Lo cercano se monta YA, por geometría: los IntersectionObserver se
  // suspenden en pestañas ocultas y su primer disparo no es inmediato.
  const margen = 300;
  const lejanos: HTMLElement[] = [];
  for (const d of drills) {
    const r = d.getBoundingClientRect();
    if (r.bottom > -margen && r.top < innerHeight + margen) montar(d);
    else lejanos.push(d);
  }
  if (lejanos.length === 0) return;

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        observador.unobserve(e.target);
        montar(e.target as HTMLElement);
      }
    },
    { rootMargin: `${margen}px` },
  );
  lejanos.forEach((d) => observador.observe(d));
}

// El arranque no puede fiarse solo de astro:page-load: en la carga inicial
// este módulo puede evaluarse DESPUÉS de que el evento ya disparó.
if (document.readyState !== 'loading') montarPendientes();
else document.addEventListener('DOMContentLoaded', () => montarPendientes(), { once: true });
document.addEventListener('astro:page-load', montarPendientes);
document.addEventListener('astro:before-swap', () => {
  // CM engancha listeners al DOM que el swap va a tirar: limpieza explícita
  document.querySelectorAll<HTMLElement>('[data-vim-drill][data-montado]').forEach((el) => {
    vivos.get(el)?.destruir();
  });
});
