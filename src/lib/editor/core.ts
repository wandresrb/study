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
  /** The caller's own extensions — a goal check, a linter, whatever it needs. */
  extensions?: Extension[];
  onChange?(doc: string): void;
  onCursor?(line: number): void;
  /** Vim mode name for a HUD; only fires when vim is on. */
  onMode?(mode: string): void;
  /** Every keypress in vim notation, with the running total. */
  onKey?(key: string, total: number): void;
}

export interface Editor {
  view: EditorView;
  readonly doc: string;
  setDoc(doc: string): void;
  /** Marks the line a runtime is executing. null clears it. */
  highlightLine(line: number | null): void;
  /** Types keys in vim notation ("ci\"adiós<Esc>"). No-op without vim. */
  sendKeys(keys: string): void;
  /** Back to the initial document and cursor. */
  reset(): void;
  focus(): void;
  destroy(): void;
}

/** `ci"adiós<Esc>` → ["c","i","\"","a",…,"<Esc>"] */
export function tokenize(keys: string): string[] {
  return keys.match(/<[^<>]+>|[\s\S]/g) ?? [];
}

/** A keydown as vim would write it. Modifier-only presses do not count. */
function keyName(ev: KeyboardEvent): string | null {
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

/* With vim on, the block cursor is the plugin's; the thin caret would double it. */
const vimCaret = EditorView.theme({ '.cm-content': { caretColor: 'transparent' } });

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

export const toOffset = (state: EditorState, [line, col]: [number, number]) => {
  const l = state.doc.line(Math.min(Math.max(line, 1), state.doc.lines));
  return Math.min(l.from + col, l.to);
};

export async function create(host: HTMLElement, opts: EditorOptions): Promise<Editor> {
  const language = await languageOf(opts.language);

  const extensions: Extension[] = [];

  // vim must come first: it intercepts keys before everything else.
  if (opts.vim) {
    const { vim } = await import('@replit/codemirror-vim');
    extensions.push(vim(), vimCaret);
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
    ...(opts.extensions ?? []),
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

  // The vim API, resolved once: sendKeys needs it on every call.
  const vimApi = opts.vim ? await import('@replit/codemirror-vim') : null;

  if (vimApi && opts.onMode) {
    vimApi.getCM(view)!.on('vim-mode-change', (m: { mode: string; subMode?: string }) => {
      opts.onMode!(m.subMode ? `${m.mode} ${m.subMode}` : m.mode);
    });
  }

  let keys = 0;
  const onKeyDown = (ev: KeyboardEvent) => {
    const name = keyName(ev);
    if (!name) return;
    keys += 1;
    opts.onKey!(name, keys);
  };
  if (opts.onKey) view.dom.addEventListener('keydown', onKeyDown, { capture: true });

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
    sendKeys(keys: string) {
      if (!vimApi) return;
      const cm = vimApi.getCM(view)!;
      for (const t of tokenize(keys)) {
        // In insert mode the emulator does not route printable keys through
        // handleKey — real typing reaches it through CodeMirror's input. Without
        // this, replaying `ci"adiós<Esc>` deletes but never writes.
        const inserting = (cm.state as { vim?: { insertMode?: boolean } }).vim?.insertMode;
        if (inserting && t.length === 1) view.dispatch(view.state.replaceSelection(t));
        // 'user' is the origin the emulator uses for real typing: with anything
        // else, recording a macro captures an empty register.
        else vimApi.Vim.handleKey(cm, t, 'user');
      }
    },
    reset() {
      keys = 0;
      view.setState(stateOf(opts.doc));
    },
    focus() {
      view.focus();
    },
    destroy() {
      if (opts.onKey) view.dom.removeEventListener('keydown', onKeyDown, { capture: true });
      view.destroy();
    },
  };
}
