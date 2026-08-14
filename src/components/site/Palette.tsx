import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { navigate } from 'astro:transitions/client';
import { fold } from '../../lib/fold';

type Entry = [string, string, string];

interface Props {
  entries: Entry[];
}

interface LessonHit {
  title: string;
  folded: string;
  label: string;
  url: string;
}

const LIMIT = 40;

const SHORTCUTS: Entry[] = [
  ['Inicio', 'ir a', '/'],
  ['Centro de Estudios', 'ir a', '/cs/'],
  ['Recursos', 'ir a', '/recursos/'],
  ['Sobre el sitio', 'ir a', '/about/'],
];

// The full catalog is fetched once, and only when the palette first opens:
// the inline entries (categories and tracks) cover the first paint.
let catalog: Promise<[string, string, string][]> | undefined;
const loadCatalog = () => {
  catalog ??= fetch('/idx/catalog.json')
    .then((r) => (r.ok ? r.json() : { lessons: [] }))
    .then((data: { lessons: [string, string, string][] }) => data.lessons)
    .catch(() => [] as [string, string, string][]);
  return catalog;
};

export default function Palette(props: Props) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [cursor, setCursor] = createSignal(0);
  const [lessons, setLessons] = createSignal<LessonHit[]>([]);

  const trackNames = new Map(
    props.entries.filter((e) => e[1] === 'tema').map((e) => [e[2].split('/')[1], e[0]]),
  );

  let input: HTMLInputElement | undefined;
  let list: HTMLUListElement | undefined;
  let box: HTMLDivElement | undefined;
  let lastFocused: HTMLElement | null = null;

  const show = () => {
    lastFocused = document.activeElement as HTMLElement | null;
    if (!lessons().length) {
      loadCatalog().then((rows) =>
        setLessons(
          rows.map(([title, id, position]) => ({
            title,
            folded: fold(title),
            label: `${trackNames.get(id.split('/')[0]) ?? id.split('/')[0]} · ${position}`,
            url: `/guia/${id}/`,
          })),
        ),
      );
    }
    setQuery('');
    setCursor(0);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    lastFocused?.focus?.();
    lastFocused = null;
  };

  const results = () => {
    const q = fold(query().trim());
    if (!q) return SHORTCUTS;

    const shortcuts = SHORTCUTS.filter((s) => fold(s[0]).includes(q));

    const scored: { entry: Entry; rank: number; kind: number }[] = [];
    for (const entry of props.entries) {
      const name = fold(entry[0]);
      const at = name.indexOf(q);
      if (at === 0) scored.push({ entry, rank: 0, kind: 0 });
      else if (at > 0) scored.push({ entry, rank: 1, kind: 0 });
      else if (fold(entry[1]).includes(q)) scored.push({ entry, rank: 2, kind: 0 });
    }
    for (const l of lessons()) {
      const at = l.folded.indexOf(q);
      if (at < 0) continue;
      scored.push({ entry: [l.title, l.label, l.url], rank: at === 0 ? 0 : 1, kind: 1 });
    }
    scored.sort((a, b) => a.rank - b.rank || a.kind - b.kind);
    return [...shortcuts, ...scored.slice(0, LIMIT).map((s) => s.entry)];
  };

  const go = (path: string) => {
    setOpen(false);
    lastFocused = null;
    navigate(path);
  };

  const move = (delta: number) => {
    const total = results().length;
    if (!total) return;
    setCursor((c) => Math.min(Math.max(c + delta, 0), total - 1));
  };

  const trapTab = (e: KeyboardEvent) => {
    if (!box) return;
    const focusables = box.querySelectorAll<HTMLElement>(
      'input, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const typing =
      target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '');

    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (open() && e.ctrlKey && !e.metaKey) move(-1);
      else if (open()) close();
      else show();
      return;
    }
    if (e.key === '/' && !typing && !open()) {
      e.preventDefault();
      show();
      return;
    }
    if (!open()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      trapTab(e);
    } else if (e.key === 'ArrowDown' || (e.ctrlKey && (e.key === 'n' || e.key === 'j'))) {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCursor(Math.max(0, results().length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results()[cursor()];
      if (hit) go(hit[2]);
    }
  };

  onMount(() => {
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.removeProperty('overflow');
    });
  });

  createEffect(() => {
    document.documentElement.style.overflow = open() ? 'hidden' : '';
    if (open()) queueMicrotask(() => input?.focus());
  });
  createEffect(() => {
    query();
    setCursor(0);
  });
  createEffect(() => {
    const i = cursor();
    queueMicrotask(() => list?.children[i]?.scrollIntoView({ block: 'nearest' }));
  });

  const optionId = (i: number) => `palette-opt-${i}`;

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Buscar en el sitio"
        class="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-borde bg-crust/60 px-3 py-1.5 font-mono text-sm text-overlay1 transition-colors hover:border-surface1 hover:text-subtext0"
      >
        <span aria-hidden="true">⌕</span>
        <span class="hidden sm:inline">Buscar</span>
        <kbd class="hidden rounded border border-surface1 px-1.5 text-2xs sm:inline">⌘K</kbd>
      </button>

      <Show when={open()}>
        <div
          class="d-modal d-modal-open items-start pt-[12vh] backdrop-blur-[3px]"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar"
            class="d-modal-box flex max-h-[70vh] w-full max-w-medida flex-col overflow-hidden border border-overlay0 bg-mantle p-0 shadow-modal"
          >
            <input
              ref={input}
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder="Busca un tema o una lección…"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-autocomplete="list"
              aria-activedescendant={results().length ? optionId(cursor()) : undefined}
              class="w-full border-0 border-b border-surface1 bg-transparent px-4 py-3.5 font-mono text-base text-text outline-none placeholder:text-overlay0"
            />

            <Show
              when={results().length > 0}
              fallback={
                <p class="m-0 px-4 py-6 font-mono text-sm text-overlay1">Nada para «{query()}».</p>
              }
            >
              <ul
                ref={list}
                id="palette-list"
                role="listbox"
                aria-label="Resultados"
                class="m-0 flex-1 list-none overflow-y-auto p-1.5"
              >
                <For each={results()}>
                  {(hit, i) => (
                    <li
                      id={optionId(i())}
                      role="option"
                      aria-selected={i() === cursor()}
                      onClick={() => go(hit[2])}
                      onMouseMove={() => setCursor(i())}
                      class="flex cursor-pointer items-baseline gap-3 rounded px-3 py-2 text-left aria-selected:bg-surface0/70"
                    >
                      <span class="w-24 shrink-0 truncate font-mono text-2xs text-overlay1">
                        {hit[1]}
                      </span>
                      <span class="truncate text-md text-subtext1">{hit[0]}</span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <p class="m-0 flex items-center gap-4 border-t border-surface1 bg-crust px-4 py-2 font-mono text-2xs text-overlay0">
              <span>↑↓ moverse</span>
              <span>⏎ abrir</span>
              <span>esc cerrar</span>
              <span class="ml-auto">{props.entries.length + lessons().length} destinos</span>
            </p>
          </div>
        </div>
      </Show>
    </>
  );
}
