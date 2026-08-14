// El motor de los drills: CodeMirror 6 + la emulación vim de Replit.
// Este módulo pesa ~90 KB gzip con sus dependencias, así que NADIE lo importa
// estáticamente: drill-mount lo trae con import() cuando el primer drill entra
// en pantalla, y todas las instancias de la página comparten el módulo.
//
// La semántica es del emulador (10 años de batalla en Replit); la piel es
// nuestra. scripts/verificar-drills.mjs contrasta cada solución contra un
// nvim --headless real: si divergen, el drill no se publica como interactivo.

import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, history } from '@codemirror/commands';
import { Vim, getCM, vim } from '@replit/codemirror-vim';

export interface DefDrill {
  /** buffer inicial; las líneas se separan con \n */
  doc: string;
  /** [línea 1-based, columna 0-based] donde empieza el cursor */
  cursor?: [number, number];
  /** buffer final esperado; si falta, el éxito es solo de cursor */
  objetivo?: string;
  /** posición final esperada, para drills de movimiento */
  objetivoCursor?: [number, number];
  /** teclas exactas de la solución: ci"adiós<Esc> — las reproduce el botón */
  solucion?: string;
  /** pulsaciones de la solución óptima; ≤ presupuesto sube el dominio a ★ */
  presupuesto?: number;
  /** teclas que se ejecutan al montar, para dejar registros o marcas calientes */
  preparacion?: string;
}

export interface Enganches {
  onModo(modo: string): void;
  onTecla(tecla: string, total: number): void;
  onExito(datos: { pulsaciones: number }): void;
}

export interface Drill {
  view: EditorView;
  reiniciar(): void;
  /** Inyecta teclas en notación vim, como si se teclearan. QA y dojo. */
  teclear(teclas: string): void;
  reproducir(velocidadMs?: number): Promise<void>;
  destruir(): void;
}

/* La piel: un terminal Catppuccin. CM6 se tematiza desde JS, que es su vía
   oficial, y así no queda ni un selector global suelto en la CSS del sitio. */
const tema = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--crust)',
      color: 'var(--text)',
      fontSize: '0.95rem',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      caretColor: 'transparent',
      padding: '0.75rem 0',
    },
    '.cm-line': { padding: '0 0.85rem' },
    '.cm-gutters': {
      backgroundColor: 'var(--crust)',
      color: 'var(--overlay0)',
      border: 'none',
      paddingLeft: '0.35rem',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--surface0) 45%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--subtext1)' },
    '&.cm-focused': { outline: 'none' },
    /* el bloque del modo Normal lo pinta el plugin vim con esta clase */
    '.cm-fat-cursor': {
      background: 'var(--mauve)',
      color: 'var(--crust)',
    },
    '&:not(.cm-focused) .cm-fat-cursor': {
      background: 'transparent',
      outline: '1px solid var(--overlay1)',
      color: 'inherit',
    },
    '.cm-selectionBackground': { backgroundColor: 'var(--surface1) !important' },
    '.cm-vim-panel': {
      backgroundColor: 'var(--mantle)',
      color: 'var(--text)',
      fontFamily: 'var(--font-mono)',
      padding: '0 0.85rem',
    },
    '.cm-vim-panel input': { color: 'var(--text)', fontFamily: 'var(--font-mono)' },
  },
  { dark: true },
);

/** "ci\"adiós<Esc>" → ["c","i","\"","a",…,"<Esc>"] */
export function tokenizar(teclas: string): string[] {
  return teclas.match(/<[^<>]+>|[\s\S]/g) ?? [];
}

/** Nombre legible de un keydown, en notación vim, para el HUD. */
function nombreTecla(ev: KeyboardEvent): string | null {
  if (ev.key === 'Shift' || ev.key === 'Control' || ev.key === 'Alt' || ev.key === 'Meta')
    return null;
  const base =
    ev.key === 'Escape' ? 'Esc'
    : ev.key === 'Enter' ? 'CR'
    : ev.key === 'Backspace' ? 'BS'
    : ev.key === 'Tab' ? 'Tab'
    : ev.key === ' ' ? 'Space'
    : ev.key;
  if (ev.ctrlKey) return `<C-${base}>`;
  if (base.length > 1) return `<${base}>`;
  return base;
}

const aOffset = (state: EditorState, [linea, col]: [number, number]) => {
  const l = state.doc.line(Math.min(Math.max(linea, 1), state.doc.lines));
  return Math.min(l.from + col, l.to);
};

const normalizar = (s: string) => s.replace(/\n$/, '');

export function montar(contenedor: HTMLElement, def: DefDrill, enganches: Enganches): Drill {
  let pulsaciones = 0;
  let conseguido = false;
  let reproduciendo = false;

  const comprobar = EditorView.updateListener.of((u) => {
    if (conseguido || reproduciendo) return;
    if (!u.docChanged && !u.selectionSet) return;
    const doc = normalizar(u.state.doc.toString());
    const docOk = def.objetivo === undefined || doc === normalizar(def.objetivo);
    let cursorOk = true;
    if (def.objetivoCursor) {
      cursorOk = u.state.selection.main.head === aOffset(u.state, def.objetivoCursor);
    }
    if (docOk && cursorOk) {
      conseguido = true;
      // fuera del ciclo de update: el enganche toca el DOM
      queueMicrotask(() => enganches.onExito({ pulsaciones }));
    }
  });

  const extensiones: Extension = [
    // vim SIEMPRE la primera: intercepta las teclas antes que el resto
    vim(),
    lineNumbers(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    keymap.of(defaultKeymap),
    tema,
    EditorView.lineWrapping,
    comprobar,
  ];

  const estadoInicial = () => {
    const state = EditorState.create({ doc: def.doc, extensions: extensiones });
    return def.cursor
      ? state.update({ selection: { anchor: aOffset(state, def.cursor) } }).state
      : state;
  };

  const view = new EditorView({ state: estadoInicial(), parent: contenedor });
  const cm = getCM(view)!;

  cm.on('vim-mode-change', (m: { mode: string; subMode?: string }) => {
    enganches.onModo(m.subMode ? `${m.mode} ${m.subMode}` : m.mode);
  });

  const alPulsar = (ev: KeyboardEvent) => {
    if (reproduciendo) return;
    const nombre = nombreTecla(ev);
    if (!nombre) return;
    pulsaciones += 1;
    enganches.onTecla(nombre, pulsaciones);
  };
  view.dom.addEventListener('keydown', alPulsar, { capture: true });

  const ejecutar = (teclas: string) => {
    for (const t of tokenizar(teclas)) Vim.handleKey(cm, t);
  };

  if (def.preparacion) ejecutar(def.preparacion);

  return {
    view,

    teclear(teclas: string) {
      ejecutar(teclas);
    },

    reiniciar() {
      conseguido = false;
      pulsaciones = 0;
      view.setState(estadoInicial());
      if (def.preparacion) ejecutar(def.preparacion);
      enganches.onModo('normal');
      enganches.onTecla('', 0);
    },

    /** Reproduce la solución tecla a tecla sobre el buffer, desde cero. */
    async reproducir(velocidadMs = 160) {
      if (!def.solucion || reproduciendo) return;
      this.reiniciar();
      reproduciendo = true;
      view.focus();
      const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      for (const t of tokenizar(def.solucion)) {
        Vim.handleKey(getCM(view)!, t);
        enganches.onTecla(t, 0);
        if (!reducido) await new Promise((r) => setTimeout(r, velocidadMs));
      }
      reproduciendo = false;
    },

    destruir() {
      view.dom.removeEventListener('keydown', alPulsar, { capture: true });
      view.destroy();
    },
  };
}
