// One CodeMirror setup for the whole site: lessons, exercises and drills.
// It knows nothing about exercises or goals — that belongs to whoever calls it.
//
// Weighs ~90 KB gzip with its dependencies, so nobody imports it statically:
// mount.ts pulls it with import() when an editor comes into view.
import { EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { languageOf, type Language } from './languages';
import { theme } from './theme';

export interface EditorOptions {
  doc: string;
  language?: Language;
  /** Real modal editing. Costs the vim plugin, so it is opt-in. */
  vim?: boolean;
  readOnly?: boolean;
  lineNumbers?: boolean;
  /** [1-based line, 0-based column] */
  cursor?: [number, number];
  onChange?(doc: string): void;
  onCursor?(line: number): void;
  /** Vim mode name for a HUD; only fires when vim is on. */
  onMode?(mode: string): void;
}

export interface Editor {
  view: EditorView;
  readonly doc: string;
  setDoc(doc: string): void;
  /** Marks the line a runtime is executing. null clears it. */
  highlightLine(line: number | null): void;
  focus(): void;
  destroy(): void;
}

const setActive = StateEffect.define<number | null>();

const activeLine = Decoration.line({ class: 'cm-runLine' });

const activeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (!e.is(setActive)) continue;
      if (e.value === null) return Decoration.none;
      const n = Math.min(Math.max(e.value, 1), tr.state.doc.lines);
      return Decoration.set([activeLine.range(tr.state.doc.line(n).from)]);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

const runLineTheme = EditorView.theme({
  '.cm-runLine': { backgroundColor: 'color-mix(in srgb, var(--yellow) 16%, transparent)' },
});

const toOffset = (state: EditorState, [line, col]: [number, number]) => {
  const l = state.doc.line(Math.min(Math.max(line, 1), state.doc.lines));
  return Math.min(l.from + col, l.to);
};

export async function create(host: HTMLElement, opts: EditorOptions): Promise<Editor> {
  const language = await languageOf(opts.language);

  const extensions: Extension[] = [];

  // vim must come first: it intercepts keys before everything else.
  if (opts.vim) {
    const { vim } = await import('@replit/codemirror-vim');
    extensions.push(vim());
  }

  if (opts.lineNumbers !== false) extensions.push(lineNumbers());
  extensions.push(
    history(),
    drawSelection(),
    highlightActiveLine(),
    bracketMatching(),
    indentOnInput(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    language,
    theme,
    activeField,
    runLineTheme,
    EditorView.lineWrapping,
    EditorState.readOnly.of(Boolean(opts.readOnly)),
  );

  if (opts.onChange || opts.onCursor) {
    extensions.push(
      EditorView.updateListener.of((u) => {
        if (u.docChanged && opts.onChange) opts.onChange(u.state.doc.toString());
        if ((u.selectionSet || u.docChanged) && opts.onCursor) {
          opts.onCursor(u.state.doc.lineAt(u.state.selection.main.head).number);
        }
      }),
    );
  }

  const stateOf = (doc: string) => {
    const state = EditorState.create({ doc, extensions });
    return opts.cursor
      ? state.update({ selection: { anchor: toOffset(state, opts.cursor) } }).state
      : state;
  };

  const view = new EditorView({ state: stateOf(opts.doc), parent: host });

  if (opts.vim && opts.onMode) {
    const { getCM } = await import('@replit/codemirror-vim');
    const cm = getCM(view)!;
    cm.on('vim-mode-change', (m: { mode: string; subMode?: string }) => {
      opts.onMode!(m.subMode ? `${m.mode} ${m.subMode}` : m.mode);
    });
  }

  return {
    view,
    get doc() {
      return view.state.doc.toString();
    },
    setDoc(doc: string) {
      view.setState(stateOf(doc));
    },
    highlightLine(line: number | null) {
      view.dispatch({ effects: setActive.of(line) });
    },
    focus() {
      view.focus();
    },
    destroy() {
      view.destroy();
    },
  };
}
