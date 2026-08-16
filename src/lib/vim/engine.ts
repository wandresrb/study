// What makes a vim exercise an exercise, and nothing else: the goal it checks,
// the keystroke budget and the solution it can replay. The editor itself is
// editor/core.ts — this file used to carry its own copy of it.
//
// The semantics are the emulator's (ten years of battle at Replit).
// scripts/verify-drills.mjs contrasts every solution against a real
// nvim --headless: if they diverge, the exercise is not published as interactive.

import { EditorView } from '@codemirror/view';
import { create, toOffset, type Editor } from '../editor/core';

export interface ExerciseDef {
  /** initial buffer; lines separated by \n */
  doc: string;
  /** [1-based line, 0-based column] where the cursor starts */
  cursor?: [number, number];
  /** expected final buffer; without it, success is cursor-only */
  goal?: string;
  /** expected final position, for movement exercises */
  goalCursor?: [number, number];
  /** the solution in exact keys: ci"adiós<Esc> — the button replays it */
  solution?: string;
  /** keystrokes of the optimal solution; ≤ budget raises mastery to ★ */
  budget?: number;
  /** keys run on mount, to leave registers or marks warm */
  setup?: string;
}

export interface Hooks {
  onMode(mode: string): void;
  onKey(key: string, total: number): void;
  onSolved(data: { keys: number }): void;
}

export interface VimExercise {
  editor: Editor;
  reset(): void;
  /** Injects keys in vim notation, as if typed. QA and the review page. */
  sendKeys(keys: string): void;
  replay(speedMs?: number): Promise<void>;
  destroy(): void;
}

const normalize = (s: string) => s.replace(/\n$/, '');

export async function mount(
  host: HTMLElement,
  def: ExerciseDef,
  hooks: Hooks,
): Promise<VimExercise> {
  let keys = 0;
  let solved = false;
  let replaying = false;

  const check = EditorView.updateListener.of((u) => {
    if (solved || replaying) return;
    if (!u.docChanged && !u.selectionSet) return;
    const doc = normalize(u.state.doc.toString());
    const docOk = def.goal === undefined || doc === normalize(def.goal);
    let cursorOk = true;
    if (def.goalCursor) {
      cursorOk = u.state.selection.main.head === toOffset(u.state, def.goalCursor);
    }
    if (docOk && cursorOk) {
      solved = true;
      // out of the update cycle: the hook touches the DOM
      queueMicrotask(() => hooks.onSolved({ keys }));
    }
  });

  const editor = await create(host, {
    doc: def.doc,
    cursor: def.cursor,
    vim: true,
    lineNumbers: true,
    extensions: [check],
    onMode: hooks.onMode,
    onKey(key, total) {
      keys = total;
      hooks.onKey(key, total);
    },
  });

  if (def.setup) editor.sendKeys(def.setup);

  const reset = () => {
    solved = false;
    keys = 0;
    editor.reset();
    if (def.setup) editor.sendKeys(def.setup);
    hooks.onMode('normal');
    hooks.onKey('', 0);
  };

  return {
    editor,
    reset,

    sendKeys(k: string) {
      editor.sendKeys(k);
    },

    /** Replays the solution key by key over the buffer, from scratch. */
    async replay(speedMs = 160) {
      if (!def.solution || replaying) return;
      reset();
      replaying = true;
      editor.focus();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      for (const t of def.solution.match(/<[^<>]+>|[\s\S]/g) ?? []) {
        editor.sendKeys(t);
        hooks.onKey(t, 0);
        if (!reduced) await new Promise((r) => setTimeout(r, speedMs));
      }
      replaying = false;
    },

    destroy() {
      editor.destroy();
    },
  };
}
