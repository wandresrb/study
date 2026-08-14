import { createEffect, createRoot } from 'solid-js';

import type { Escena, Montar } from '../lib/escena';
import { empujar, fase, irA, pila, plegarConsola } from './estado';
import { MARCAS, PASOS } from './guion';
const seguirEstado = () => {
  sueltaEstado?.();
  sueltaEstado = createRoot((soltar) => {
    createEffect(() => {
      const f = fase();
      document.documentElement.dataset.fase = f;
      const esc = anfitrion && montadas.get(anfitrion);

      if (f === 'corriendo') {
        esc?.arrancar?.();
      } else if (f === 'inicio') {
        esc?.reiniciar?.();
        window.scrollTo({ top: 0, behavior: 'auto' });
        avance = -1;
        crudo = -1;
        medir();
      }
    });
    return soltar;
  });
};

const CARGA: Record<string, () => Promise<{ montar: Montar }>> = {
  hardware: () => import('../lib/board'),
};

let portada: HTMLElement | null = null;
let capa: HTMLElement | null = null;
let anfitrion: HTMLElement | null = null;
let aviso: HTMLElement | null = null;
let avance = -1;
let crudo = -1;
let pendiente = false;
let activa = -1;

const montadas = new Map<HTMLElement, Escena>();
const montando = new Set<HTMLElement>();
let vigia: IntersectionObserver | null = null;

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let sueltaEstado: (() => void) | null = null;

const medir = () => {
  pendiente = false;
  if (!capa) return;
  const vh = window.innerHeight;
  const r = capa.getBoundingClientRect();
  const recorrido = r.height - vh;
  const bruto = recorrido > 0 ? -r.top / recorrido : r.top <= 0 ? 1 : 0;
  const ahora = Math.min(1, Math.max(0, bruto));

  const p = Math.round(ahora * PASOS) / PASOS;
  if (p !== avance) {
    avance = p;
    capa.style.setProperty('--p', String(p));
  }
  if (ahora !== crudo) {
    crudo = ahora;
    const esc = anfitrion && montadas.get(anfitrion);
    if (esc) esc.avance(ahora);
    if (aviso) {
      if (ahora > 0.06) aviso.dataset.lejos = '';
      else delete aviso.dataset.lejos;
    }
  }

  let k = 0;
  for (let i = 0; i < MARCAS.length; i++) if (ahora >= MARCAS[i]) k = i;
  activa = k;
};

const alScroll = () => {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(medir);
};

const irAMomento = (k: number) => {
  if (!capa) return;
  const f = MARCAS[Math.max(0, Math.min(MARCAS.length - 1, k))];
  const arriba = capa.getBoundingClientRect().top + window.scrollY;
  const recorrido = Math.max(0, capa.offsetHeight - window.innerHeight);
  window.scrollTo({
    top: arriba + recorrido * f,
    behavior: reducido() ? 'auto' : 'smooth',
  });
};

let ultimaG = -1e9;

const alTeclado = (e: KeyboardEvent) => {
  if (!capa) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (fase() !== 'corriendo') return;

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
    case 'PageDown':
      e.preventDefault();
      irAMomento(activa + 1);
      break;
    case 'k':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault();
      irAMomento(activa - 1);
      break;
    case 'g':
      e.preventDefault();
      if (performance.now() - ultimaG < 500) irAMomento(0);
      ultimaG = performance.now();
      break;
    case 'G':
    case 'End':
      e.preventDefault();
      irAMomento(MARCAS.length - 1);
      break;
    case 'Home':
      e.preventDefault();
      irAMomento(0);
      break;
  }
};

const soltarTodas = () => {
  for (const esc of montadas.values()) esc.destruir();
  montadas.clear();
  montando.clear();
  vigia?.disconnect();
  vigia = null;
};

const vigilar = () => {
  vigia = new IntersectionObserver(
    (entradas) => {
      for (const ent of entradas) {
        const host = ent.target as HTMLElement;
        const carga = CARGA[host.dataset.scene ?? ''];
        if (!carga) continue;

        if (ent.isIntersecting) {
          if (montadas.has(host) || montando.has(host)) continue;
          montando.add(host);
          carga()
            .then((m) => m.montar(host))
            .then((esc) => {
              if (!montando.has(host)) {
                esc.destruir();
                return;
              }
              montadas.set(host, esc);
              esc.avance(crudo < 0 ? 0 : crudo);
            })
            .catch((err) => {
              if (import.meta.env.DEV) console.warn('[portada] escena no montada:', err);
            })
            .finally(() => montando.delete(host));
        } else {
          montando.delete(host);
          const esc = montadas.get(host);
          if (esc) {
            esc.destruir();
            montadas.delete(host);
          }
        }
      }
    },
    { rootMargin: '60% 0px 60% 0px' },
  );
  if (anfitrion) vigia.observe(anfitrion);
};

document.addEventListener('scroll', alScroll, { passive: true });
window.addEventListener('resize', alScroll);
document.addEventListener('keydown', alTeclado);
document.addEventListener('astro:before-swap', soltarTodas);

document.addEventListener('astro:before-swap', () => {
  sueltaEstado?.();
  sueltaEstado = null;
  delete document.documentElement.dataset.fase;
});

document.addEventListener('astro:page-load', () => {
  portada = document.getElementById('portada');
  capa = portada?.querySelector<HTMLElement>('[data-layer]') ?? null;
  anfitrion = capa?.querySelector<HTMLElement>('[data-scene]') ?? null;
  aviso = document.getElementById('teclas');
  avance = -1;
  crudo = -1;
  activa = -1;
  if (!portada) return;

  if (reducido() && pila().length === 0) {
    empujar('HARDWARE');
    plegarConsola(true);
    irA('corriendo');
  }
  seguirEstado();
  medir();
  if (!reducido()) vigilar();
});
