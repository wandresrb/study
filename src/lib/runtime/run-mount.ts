// Wires the buttons of a <Run> figure to an editor and a runtime. The runtime is
// pulled on the first click: a lesson the reader never runs pays nothing for it.
import { editorOf } from '../editor/mount';
import type { RunEvent, Runtime, Test, TestResult } from './types';

type JsModule = typeof import('./js');

let js: Promise<JsModule> | null = null;
const loadJs = () => (js ??= import('./js'));

const runtimes = new WeakMap<HTMLElement, Runtime>();
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

  for await (const e of rt.run(editor.doc, tests) as AsyncIterable<RunEvent>) {
    if (e.k === 'out') write(e.text);
    else if (e.k === 'err') write(e.text, 'text-red');
    else if (e.k === 'tests') paintTests(root, e.results);
    else if (e.k === 'done') {
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

// Delegated once: figures come and go with every navigation.
document.addEventListener('click', (e) => {
  const button = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-action]');
  const root = button?.closest<HTMLElement>('[data-run]');
  if (!button || !root) return;
  if (button.dataset.action === 'run') void run(root);
  else if (button.dataset.action === 'reset') reset(root);
});

// The pristine text, captured once the editor exists, so ↻ has something to go back to.
document.addEventListener('editor:ready', (e) => {
  const host = e.target as HTMLElement;
  const editor = editorOf(host);
  if (editor && !originals.has(host)) originals.set(host, editor.doc);
});

document.addEventListener('astro:before-swap', () => {
  for (const root of document.querySelectorAll<HTMLElement>('[data-run]')) {
    runtimes.get(root)?.destroy();
    runtimes.delete(root);
  }
});
