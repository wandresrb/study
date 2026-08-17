import { For, Show } from 'solid-js';

import './editor.css';
import { OUTPUT, AFTER_OUTPUT } from '../../home/program';
import {
  push,
  write,
  phase,
  goTo,
  clearOutput,
  collapsed,
  collapseConsole,
  output,
} from '../../home/state';

const PANEL = 'rounded-sm border border-overlay0 overflow-hidden';
const BAR = 'm-0 border-b border-surface1 bg-crust px-3.5 py-2 font-mono';


function RunButton() {

  let timers: number[] = [];

  const run = () => {
    if (phase() !== 'start') return;
    clearOutput();

    for (const l of OUTPUT) {
      timers.push(window.setTimeout(() => write(l.text, l.cls), l.t));
    }

    const last = OUTPUT[OUTPUT.length - 1].t;
    timers.push(
      window.setTimeout(() => {
        push('HARDWARE');
        collapseConsole(true);
        goTo('running');
        timers = [];
      }, last + AFTER_OUTPUT),
    );
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={phase() !== 'start'}
      class="inline-flex cursor-pointer items-center gap-2.5 justify-self-start px-4 py-2.5 font-mono text-sm text-green transition-colors bg-green/20 focus-visible:bg-green/20 disabled:cursor-default disabled:opacity-45"
    >
      <span aria-hidden="true" class="text-2xs">
        ▶
      </span>
      <span>Run</span>
      <kbd class="inline-grid min-w-5 place-items-center rounded border border-b-2 border-green/35 bg-mantle/80 px-1.5 py-px text-2xs text-green/70">
        ⏎
      </kbd>
    </button>
  )
}


export default function Console(props: { code: string }) {


  return (
    <div>
      <div class="mt-3 grid gap-3" classList={{ hidden: collapsed() }}>
        <div class={`${PANEL} bg-mantle`}>
          <div class='flex justify-between'>
            <p class={`${BAR} flex items-center gap-1.5 text-xs text-subtext0`}>
              <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
              <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
              <span aria-hidden="true" class="size-2 rounded-full bg-surface1" />
              <b class="ml-2 font-normal">main.rs</b>
            </p>
            <RunButton />
          </div>

          <div class="editor" innerHTML={props.code} />

          <p class="m-0 flex items-center gap-3 border-t border-surface1 bg-crust px-3.5 py-1.5 font-mono text-2xs text-subtext0">
            <b class="bg-blue px-2 py-0.5 font-semibold tracking-smallcaps text-crust">
              NORMAL
            </b>
            <span class="text-subtext0">main.rs</span>
            <i class="not-italic">rust · utf-8</i>
            <em class="ml-auto not-italic text-subtext0">6:5</em>
          </p>
        </div>

        <div class={`${PANEL} bg-crust`}>
          <p class={`${BAR} flex items-baseline gap-2.5 text-2xs text-subtext0`}>
            <b class="font-medium text-subtext0">zsh</b> <span>~/maquina</span>
          </p>
          <pre
            aria-live="polite"
            class="m-0 min-h-[4.6rem] px-3.5 py-2.5 font-mono text-xs/relaxed whitespace-pre-wrap text-subtext0"
          >
            <For each={output()}>
              {(l) => (
                <>
                  <span class={l.cls}>{l.text}</span>
                  {'\n'}
                </>
              )}
            </For>
            {}
            <Show when={output().length === 0}>
              <span class="text-subtext0">
                ${' '}
                <b class="inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-blink bg-subtext0" />
              </span>
            </Show>
          </pre>
        </div>

      </div>
    </div>
  );
}
