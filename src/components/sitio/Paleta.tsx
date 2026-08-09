/**
 * La paleta de comandos: ⌘K para navegar.
 *
 * El índice viene INCRUSTADO desde `Cabecera.astro`, no se pide.
 *
 * Antes esto hacía `fetch('/buscar.json')` — un fichero que no existe en el
 * repositorio ni lo genera ningún endpoint. La paleta parecía funcionar porque
 * con el campo vacío pinta los cuatro atajos, que son estáticos; en cuanto
 * escribías algo el `fetch` daba 404, `datos()` quedaba en `[]` y no salía
 * nada. Nunca llegó a buscar.
 *
 * Y aunque existiera, indexaba las 5074 LECCIONES, que es lo que no se busca
 * para navegar: escribías «matemáticas» o «neovim» y no había resultados,
 * porque ninguna de las dos cosas es el título de una lección. Ahora son las 12
 * categorías y los 59 temas: 71 filas que caben de sobra en el HTML.
 *
 * En Solid porque aquí sí paga: lista filtrada, cursor de teclado, foco.
 */

import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';

/** [nombre, clase, ruta] — tuplas, no objetos. */
type Entrada = [string, string, string];

interface Props {
  entradas: Entrada[];
}

/** Cuántos resultados se pintan. Más no cabe en pantalla. */
const TOPE = 40;

const ATAJOS: Entrada[] = [
  ['Inicio', 'ir a', '/'],
  ['Todos los temas', 'ir a', '/mapa/'],
  ['Recursos', 'ir a', '/recursos/'],
  ['Sobre mí', 'ir a', '/about/'],
];

/**
 * Sin acentos y en minúsculas: «matematica» tiene que encontrar «Matemática».
 *
 * El rango va en escapes (`̀-ͯ`), no como caracteres literales: son
 * marcas combinantes, así que escritas a pelo se pegan al corchete anterior y
 * el fichero deja de decir lo que hace.
 */
const normal = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function Paleta(props: Props) {
  const [abierta, setAbierta] = createSignal(false);
  const [consulta, setConsulta] = createSignal('');
  const [cursor, setCursor] = createSignal(0);

  let campo: HTMLInputElement | undefined;
  let lista: HTMLUListElement | undefined;

  const abrir = () => {
    setAbierta(true);
    setConsulta('');
    setCursor(0);
  };

  const resultados = () => {
    const q = normal(consulta().trim());
    if (!q) return ATAJOS;

    const atajos = ATAJOS.filter((a) => normal(a[0]).includes(q));

    // Se puntúa por DÓNDE cae la coincidencia: lo que empieza por lo escrito va
    // antes que lo que solo lo contiene. Sin eso, buscar «git» devuelve primero
    // cualquier nombre con «digito» dentro.
    const puntuados: { e: Entrada; p: number }[] = [];
    for (const e of props.entradas) {
      const t = normal(e[0]);
      const i = t.indexOf(q);
      if (i === 0) puntuados.push({ e, p: 0 });
      else if (i > 0) puntuados.push({ e, p: 1 });
      else if (normal(e[1]).includes(q)) puntuados.push({ e, p: 2 });
    }
    puntuados.sort((a, b) => a.p - b.p);
    return [...atajos, ...puntuados.slice(0, TOPE).map((x) => x.e)];
  };

  const ir = (ruta: string) => {
    setAbierta(false);
    window.location.href = ruta;
  };

  const alTeclado = (e: KeyboardEvent) => {
    // ⌘K en Mac, Ctrl+K en el resto. Y `/` como en tantos sitios de lectura,
    // pero solo si no estás escribiendo en un campo.
    const destino = e.target as HTMLElement | null;
    const escribiendo =
      destino?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(destino?.tagName ?? '');

    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      abierta() ? setAbierta(false) : abrir();
      return;
    }
    if (e.key === '/' && !escribiendo && !abierta()) {
      e.preventDefault();
      abrir();
      return;
    }
    if (!abierta()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setAbierta(false);
    } else if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey) || (e.key === 'j' && e.ctrlKey)) {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, resultados().length - 1));
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey) || (e.key === 'k' && e.ctrlKey)) {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = resultados()[cursor()];
      if (r) ir(r[2]);
    }
  };

  onMount(() => {
    document.addEventListener('keydown', alTeclado);
    onCleanup(() => document.removeEventListener('keydown', alTeclado));
  });

  // El foco al abrir, y el cursor de vuelta arriba en cuanto cambia la
  // consulta: si no, escribes y el resaltado se queda en un resultado que ya no
  // está donde estaba.
  createEffect(() => {
    if (abierta()) queueMicrotask(() => campo?.focus());
  });
  createEffect(() => {
    consulta();
    setCursor(0);
  });
  // Y el elemento marcado tiene que verse: con teclado se sale de la lista.
  createEffect(() => {
    const i = cursor();
    queueMicrotask(() => {
      lista?.children[i]?.scrollIntoView({ block: 'nearest' });
    });
  });

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Buscar en el sitio"
        class="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-borde bg-crust/60 px-3 py-1.5 font-mono text-[0.78rem] text-overlay1 transition-colors hover:border-surface1 hover:text-subtext0"
      >
        <span aria-hidden="true">⌕</span>
        <span class="hidden sm:inline">Buscar</span>
        <kbd class="hidden rounded border border-surface1 px-1.5 text-[0.7rem] sm:inline">⌘K</kbd>
      </button>

      <Show when={abierta()}>
        <div
          class="fixed inset-0 z-50 flex items-start justify-center bg-crust/70 px-4 pt-[12vh] backdrop-blur-[3px]"
          onClick={(e) => e.target === e.currentTarget && setAbierta(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar"
            class="flex max-h-[70vh] w-full max-w-[42rem] flex-col overflow-hidden rounded-lg border border-overlay0 bg-mantle shadow-[0_24px_70px_-20px_rgb(0_0_0/0.8)]"
          >
            <input
              ref={campo}
              value={consulta()}
              onInput={(e) => setConsulta(e.currentTarget.value)}
              placeholder="Busca una categoría o un tema…"
              class="w-full border-0 border-b border-surface1 bg-transparent px-4 py-3.5 font-mono text-[0.95rem] text-text outline-none placeholder:text-overlay0"
            />

            <Show
              when={resultados().length > 0}
              fallback={
                <p class="m-0 px-4 py-6 font-mono text-[0.8rem] text-overlay1">
                  Nada para «{consulta()}».
                </p>
              }
            >
              <ul ref={lista} class="m-0 flex-1 list-none overflow-y-auto p-1.5">
                <For each={resultados()}>
                  {(r, i) => (
                    <li>
                      <button
                        type="button"
                        onClick={() => ir(r[2])}
                        onMouseMove={() => setCursor(i())}
                        aria-current={i() === cursor() ? 'true' : undefined}
                        class="flex w-full cursor-pointer items-baseline gap-3 rounded px-3 py-2 text-left aria-[current]:bg-surface0/70"
                      >
                        <span class="w-24 shrink-0 truncate font-mono text-[0.7rem] text-overlay1">
                          {r[1]}
                        </span>
                        <span class="truncate text-[0.88rem] text-subtext1">{r[0]}</span>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <p class="m-0 flex items-center gap-4 border-t border-surface1 bg-crust px-4 py-2 font-mono text-[0.68rem] text-overlay0">
              <span>↑↓ moverse</span>
              <span>⏎ abrir</span>
              <span>esc cerrar</span>
              <span class="ml-auto">{props.entradas.length} destinos</span>
            </p>
          </div>
        </div>
      </Show>
    </>
  );
}
