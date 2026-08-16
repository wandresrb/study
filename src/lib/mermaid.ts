import { DEFAULT_THEME } from './themes';

type Mermaid = typeof import('mermaid').default;

let mermaid: Mermaid | null = null;
// Theme the current initialize() ran against. Mermaid bakes colors into the
// SVG, so a theme switch needs a re-init and a repaint, not just new CSS.
let themed: string | null = null;

async function paint() {
  const nodes = document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-drawn])');
  if (!nodes.length) return;
  // Mermaid replaces the <pre> contents with the SVG, so keep the source: it
  // is the only way to redraw the same diagram under another palette.
  nodes.forEach((n) => {
    if (n.dataset.src === undefined) n.dataset.src = n.textContent ?? '';
    n.setAttribute('data-drawn', '');
  });

  if (!mermaid) ({ default: mermaid } = await import('mermaid'));

  const theme = document.documentElement.dataset.theme ?? DEFAULT_THEME;
  if (themed !== theme) {
    themed = theme;
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const crust = v('--crust');
    const mantle = v('--mantle');
    const surface0 = v('--surface0');
    const surface1 = v('--surface1');
    const surface2 = v('--surface2');
    const overlay0 = v('--overlay0');
    const text = v('--text');
    const mauve = v('--mauve');
    const blue = v('--blue');
    const green = v('--green');
    const peach = v('--peach');
    const pink = v('--pink');
    const teal = v('--teal');
    const yellow = v('--yellow');
    const lavender = v('--lavender');
    const sapphire = v('--sapphire');
    const maroon = v('--maroon');
    const red = v('--red');

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      fontFamily: 'JetBrains Mono, monospace',
      themeVariables: {
        darkMode: true,
        fontSize: '14px',

        background: crust,
        mainBkg: surface0,
        primaryColor: surface0,
        primaryTextColor: text,
        primaryBorderColor: mauve,
        secondaryColor: surface1,
        secondaryTextColor: text,
        secondaryBorderColor: surface2,
        tertiaryColor: mantle,
        tertiaryTextColor: text,
        tertiaryBorderColor: surface1,
        lineColor: blue,
        arrowheadColor: blue,
        defaultLinkColor: blue,
        textColor: text,
        titleColor: text,
        border2: surface1,

        nodeBorder: mauve,
        nodeTextColor: text,
        clusterBkg: mantle,
        clusterBorder: surface1,
        nodeBkg: surface0,
        edgeLabelBackground: mantle,
        labelTextColor: text,
        labelBackgroundColor: mantle,
        labelBoxBkgColor: surface0,
        labelBoxBorderColor: mauve,
        scaleLabelColor: text,

        actorBkg: surface0,
        actorBorder: mauve,
        actorTextColor: text,
        actorLineColor: overlay0,
        signalColor: text,
        signalTextColor: text,
        messageTextColor: text,
        loopTextColor: text,
        noteBkgColor: surface1,
        noteBorderColor: yellow,
        noteTextColor: text,
        activationBkgColor: surface1,
        activationBorderColor: mauve,
        sequenceNumberColor: crust,
        altBackground: mantle,

        stateBkg: surface0,
        stateLabelColor: text,
        transitionColor: blue,
        transitionLabelColor: text,
        compositeBackground: mantle,
        compositeBorder: surface1,
        compositeTitleBackground: surface0,
        innerEndBackground: mauve,
        specialStateColor: text,
        errorBkgColor: red,
        errorTextColor: crust,

        cScale0: surface0,  cScaleLabel0: text,
        cScale1: surface1,  cScaleLabel1: text,
        cScale2: mantle,    cScaleLabel2: text,
        cScale3: surface0,  cScaleLabel3: text,
        cScale4: surface1,  cScaleLabel4: text,
        cScale5: mantle,    cScaleLabel5: text,
        cScale6: surface0,  cScaleLabel6: text,
        cScale7: surface1,  cScaleLabel7: text,
        cScale8: mantle,    cScaleLabel8: text,
        cScale9: surface0,  cScaleLabel9: text,
        cScale10: surface1, cScaleLabel10: text,
        cScale11: mantle,   cScaleLabel11: text,

        cScalePeer0: mauve, cScalePeer1: blue, cScalePeer2: green,
        cScalePeer3: peach, cScalePeer4: pink, cScalePeer5: teal,
        cScalePeer6: yellow, cScalePeer7: lavender, cScalePeer8: sapphire,
        cScalePeer9: maroon, cScalePeer10: mauve, cScalePeer11: blue,

        git0: mauve, git1: blue, git2: green, git3: peach,
        git4: pink, git5: teal, git6: yellow, git7: lavender,
        gitBranchLabel0: crust, gitBranchLabel1: crust,
        gitBranchLabel2: crust, gitBranchLabel3: crust,
        gitBranchLabel4: crust, gitBranchLabel5: crust,
        gitBranchLabel6: crust, gitBranchLabel7: crust,
      },
    });
  }

  try { await mermaid.run({ nodes, suppressErrors: true }); } catch (e) { console.warn('mermaid', e); }
}

/** Restores every rendered diagram to its source so paint() draws it again. */
function repaint() {
  const done = document.querySelectorAll<HTMLElement>('pre.mermaid[data-drawn]');
  for (const n of done) {
    if (n.dataset.src === undefined) continue;
    n.textContent = n.dataset.src;
    n.removeAttribute('data-drawn');
    n.removeAttribute('data-processed');
  }
  if (done.length) void paint();
}

document.addEventListener('astro:page-load', paint);

// Watch the attribute, not the switcher: the theme is written from the palette
// and from the pre-paint script in BaseLayout, and later from whatever else.
new MutationObserver(repaint).observe(document.documentElement, {
  attributeFilter: ['data-theme'],
});
