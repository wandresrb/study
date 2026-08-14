type Mermaid = typeof import('mermaid').default;

let mermaid: Mermaid | null = null;

async function pintar() {
  const nodes = document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-procesado])');
  if (!nodes.length) return;
  nodes.forEach((n) => n.setAttribute('data-procesado', ''));

  if (!mermaid) {
    ({ default: mermaid } = await import('mermaid'));

    // Colors come from the active theme's tokens at first paint. Mermaid
    // initializes once, so diagrams keep that palette until the next page
    // load even if the theme switches afterwards — acceptable for a lazy,
    // per-page renderer.
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

document.addEventListener('astro:page-load', pintar);
