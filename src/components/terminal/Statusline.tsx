import { createSignal, onCleanup, onMount } from 'solid-js';

type Mode = 'NORMAL' | 'INSERT';

// v0: NORMAL as base, INSERT while focus is typing. COMMAND and SEARCH arrive
// with the omnibar (F3).
const MODE_CLASS: Record<Mode, string> = {
  NORMAL: 'bg-green text-crust',
  INSERT: 'bg-blue text-crust',
};

export default function Statusline(props: { path: string; hint?: string }) {
  const [mode, setMode] = createSignal<Mode>('NORMAL');
  const [theme, setTheme] = createSignal('kanagawa');

  onMount(() => {
    setTheme(document.documentElement.dataset.theme ?? 'kanagawa');

    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme ?? 'kanagawa'),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const typing = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? ''));
    };
    const onFocusIn = (e: FocusEvent) => setMode(typing(e.target) ? 'INSERT' : 'NORMAL');
    const onFocusOut = () => setMode('NORMAL');
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    onCleanup(() => {
      observer.disconnect();
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    });
  });

  return (
    <div class="flex items-stretch gap-0 border-t border-border bg-mantle font-mono text-xs">
      <span class={`flex items-center px-3 font-bold tracking-widest ${MODE_CLASS[mode()]}`}>
        -- {mode()} --
      </span>
      <span class="flex min-w-0 flex-1 items-center truncate bg-surface0/60 px-3 text-subtext0">
        {props.path}
      </span>
      {props.hint && (
        <span class="hidden items-center px-3 text-overlay0 sm:flex">{props.hint}</span>
      )}
      <span class="flex items-center bg-surface0/60 px-3 text-overlay1">{theme()}</span>
    </div>
  );
}
