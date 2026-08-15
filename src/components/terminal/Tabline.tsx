import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { navigate } from 'astro:transitions/client';

interface Tab {
  id: string;
  title: string;
  href: string;
}

// The default session: the tabs the site opens with, like a session.vim.
// The user owns them from there — close, switch, and (later) open new ones.
const DEFAULT_TABS: Tab[] = [
  { id: '~', title: '~', href: '/' },
  { id: 'cs', title: 'cs', href: '/cs/' },
  { id: 'concepts', title: 'concepts', href: '/concepts/' },
];

const load = (): Tab[] => {
  try {
    const raw = localStorage.getItem('session:tabs');
    if (raw) {
      const tabs = JSON.parse(raw) as Tab[];
      if (Array.isArray(tabs) && tabs.length && tabs.every((t) => t?.id && t?.href)) return tabs;
    }
  } catch {
    /* private mode */
  }
  return DEFAULT_TABS;
};

const save = (tabs: Tab[]) => {
  try {
    localStorage.setItem('session:tabs', JSON.stringify(tabs));
  } catch {
    /* private mode */
  }
};

export default function Tabline(props: { active: string }) {
  const [tabs, setTabs] = createSignal<Tab[]>(DEFAULT_TABS);
  onMount(() => setTabs(load()));

  const activeIndex = () => tabs().findIndex((t) => t.id === props.active);

  const close = (id: string, e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    // Closing the last tab reopens the default session: there is no "exit".
    let next = tabs().filter((t) => t.id !== id);
    if (!next.length) next = DEFAULT_TABS;
    setTabs(next);
    save(next);
    if (id === props.active) navigate(next[Math.max(0, Math.min(activeIndex(), next.length - 1))].href);
  };

  const cycle = (delta: number) => {
    const list = tabs();
    if (!list.length) return;
    const i = (activeIndex() + delta + list.length) % list.length;
    if (list[i].id !== props.active) navigate(list[i].href);
  };

  // gt / gT with a pending-g window, like the editor.
  let pendingG = false;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (pendingG) {
      pendingG = false;
      clearTimeout(pendingTimer);
      if (e.key === 't') {
        e.preventDefault();
        cycle(1);
        return;
      }
      if (e.key === 'T') {
        e.preventDefault();
        cycle(-1);
        return;
      }
    }
    if (e.key === 'g') {
      pendingG = true;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => (pendingG = false), 600);
    }
  };

  onMount(() => {
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  });

  // Faithful to nvim's default tabline: one flat text line — TabLineSel on the
  // active tab, TabLine on the rest, TabLineFill in between, and a single X at
  // the far right that closes the current tab.
  return (
    <div
      role="tablist"
      aria-label="Tabs de la sesión"
      class="flex items-stretch overflow-x-auto bg-mantle font-mono text-sm"
    >
      <For each={tabs()}>
        {(tab, i) => (
          <a
            href={tab.href}
            role="tab"
            aria-selected={tab.id === props.active}
            class={
              tab.id === props.active
                ? 'flex shrink-0 items-center gap-2 bg-base px-4 py-1.5 font-semibold text-text no-underline'
                : 'flex shrink-0 items-center gap-2 px-4 py-1.5 text-overlay1 no-underline hover:bg-surface0/40 hover:text-subtext0'
            }
          >
            <span class="text-2xs text-overlay0">{i() + 1}</span>
            {tab.title}
          </a>
        )}
      </For>
      <span class="flex-1"></span>
      <button
        type="button"
        aria-label="Cerrar la tab actual"
        onClick={(e) => close(props.active, e)}
        class="shrink-0 px-3 py-1.5 text-overlay1 hover:bg-surface0/40 hover:text-red"
      >
        X
      </button>
    </div>
  );
}
