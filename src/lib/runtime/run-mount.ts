// Wires the buttons of a code <Exercise> to an editor and a runtime. The runtime
// is pulled on the first click: a lesson the reader never runs pays nothing.
import { lazyMount } from '../editor/mount';
import { complete, get, lessonIdOf } from '../learner';
import type { Editor, EditorOptions } from '../editor/core';
import type { RunEvent, Runtime, Test, TestResult } from './types';

type JsModule = typeof import('./js');

let js: Promise<JsModule> | null = null;
const loadJs = () => (js ??= import('./js'));

const runtimes = new WeakMap<HTMLElement, Runtime>();
/** Runs in this visit: solving it on the first try is what earns the star. */
const attempts = new WeakMap<HTMLElement, number>();

function paintState(root: HTMLElement, mastery: number | undefined) {
  const el = root.querySelector<HTMLElement>('[data-state]');
  if (!el) return;
  el.textContent = mastery === 2 ? '★' : mastery !== undefined ? '✓' : '○';
  el.className =
    'font-mono text-sm normal-case ' +
    (mastery === 2 ? 'text-yellow' : mastery !== undefined ? 'text-green' : 'text-overlay0');
}

/** Files a passing run in the learner store and repaints the mark. */
async function record(root: HTMLElement, attempt: number, solution: string, tests: Test[]) {
  const id = root.dataset.id;
  if (!id) return;
  const lesson = lessonIdOf(location.href);
  const itemId = `${lesson}#${id}`;
  await complete(itemId, {
    kind: 'exercise',
    lesson,
    label: root.dataset.label,
    // enough to replay it away from its lesson
    data: { solution, tests },
    noHint: true,
    withinBudget: attempt === 1,
  });
  paintState(root, (await get(itemId))?.mastery);
}
const originals = new WeakMap<HTMLElement, string>();

const jsonIn = <T,>(root: ParentNode, sel: string): T | null => {
  const raw = root.querySelector(`${sel} script[type="application/json"]`)?.textContent;
  return raw ? (JSON.parse(raw) as T) : null;
};

function paintTests(root: HTMLElement, results: TestResult[]) {
  const box = root.querySelector<HTMLElement>('[data-tests]');
  const list = root.querySelector<HTMLElement>('[data-test-list]');
  if (!box || !list) return;
  box.classList.remove('hidden');
  list.textContent = '';
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.pass ? 'text-green' : 'text-red';
    const name = r.label ?? r.call;
    li.textContent = r.pass
      ? `✓ ${name}`
      : `✗ ${name} — ${r.error ? r.error : `dio ${r.got}, se esperaba ${r.want}`}`;
    list.append(li);
  }
}

async function run(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('[data-editor]');
  const editor = host && editorOf(host);
  if (!editor) return;

  const out = root.querySelector<HTMLElement>('[data-out]');
  const button = root.querySelector<HTMLButtonElement>('[data-action="run"]');
  if (out) {
    out.hidden = false;
    out.textContent = '';
  }
  if (button) button.disabled = true;

  const { jsRuntime } = await loadJs();
  let rt = runtimes.get(root);
  if (!rt) runtimes.set(root, (rt = jsRuntime()));

  const tests = jsonIn<Test[]>(root, '[data-tests]') ?? [];
  const write = (text: string, cls?: string) => {
    if (!out) return;
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = `${text}\n`;
    out.append(span);
    out.scrollTop = out.scrollHeight;
  };

  const attempt = (attempts.get(root) ?? 0) + 1;
  attempts.set(root, attempt);

  for await (const e of rt.run(editor.doc, tests) as AsyncIterable<RunEvent>) {
    if (e.k === 'out') write(e.text);
    else if (e.k === 'err') write(e.text, 'text-red');
    else if (e.k === 'tests') {
      paintTests(root, e.results);
      if (e.results.length && e.results.every((r) => r.pass)) {
        void record(root, attempt, editor.doc, tests);
      }
    } else if (e.k === 'done') {
      if (out && !out.textContent) write('(sin salida)', 'text-overlay0');
      write(`— ${e.ms} ms`, 'text-overlay0');
    }
  }
  if (button) button.disabled = false;
}

function reset(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('[data-editor]');
  const editor = host && editorOf(host);
  if (!host || !editor) return;
  const first = originals.get(host);
  if (first !== undefined) editor.setDoc(first);
  const out = root.querySelector<HTMLElement>('[data-out]');
  if (out) {
    out.hidden = true;
    out.textContent = '';
  }
  root.querySelector('[data-tests]')?.classList.add('hidden');
}

/** Mounts the code editor of an <Exercise code=…>. */
async function setupEditor(host: HTMLElement): Promise<Editor | void> {
  const raw = host.querySelector('script[type="application/json"]')?.textContent;
  if (!raw) return;
  const slot = host.querySelector<HTMLElement>('[data-editor-slot]') ?? host;
  slot.textContent = ''; // drop the SSR fallback
  const { create } = await import('../editor/core');
  const editor = await create(slot, JSON.parse(raw) as EditorOptions);
  originals.set(host, editor.doc);
  const root = host.closest<HTMLElement>('[data-run]');
  if (root?.dataset.id) {
    void get(`${lessonIdOf(location.href)}#${root.dataset.id}`).then((r) => paintState(root, r?.mastery));
  }
  return editor;
}

const { instanceOf } = lazyMount('[data-editor]', setupEditor);
const editorOf = (host: HTMLElement) => instanceOf(host) as Editor | undefined;

// Delegated once: figures come and go with every navigation.
document.addEventListener('click', (e) => {
  const button = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-action]');
  const root = button?.closest<HTMLElement>('[data-run]');
  if (!button || !root) return;
  if (button.dataset.action === 'run') void run(root);
  else if (button.dataset.action === 'reset') reset(root);
});


document.addEventListener('astro:before-swap', () => {
  for (const root of document.querySelectorAll<HTMLElement>('[data-run]')) {
    runtimes.get(root)?.destroy();
    runtimes.delete(root);
  }
});
