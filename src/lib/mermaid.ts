type Mermaid = typeof import('mermaid').default;

let mermaid: Mermaid | null = null;

async function pintar() {
  const nodes = document.querySelectorAll<HTMLElement>('pre.mermaid:not([data-procesado])');
  if (!nodes.length) return;
  nodes.forEach((n) => n.setAttribute('data-procesado', ''));

  if (!mermaid) {
    ({ default: mermaid } = await import('mermaid'));
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      fontFamily: 'JetBrains Mono, monospace',
      themeVariables: {
        darkMode: true,
        fontSize: '14px',

        background: '#11111b',
        mainBkg: '#313244',
        primaryColor: '#313244',
        primaryTextColor: '#cdd6f4',
        primaryBorderColor: '#cba6f7',
        secondaryColor: '#45475a',
        secondaryTextColor: '#cdd6f4',
        secondaryBorderColor: '#585b70',
        tertiaryColor: '#181825',
        tertiaryTextColor: '#cdd6f4',
        tertiaryBorderColor: '#45475a',
        lineColor: '#89b4fa',
        arrowheadColor: '#89b4fa',
        defaultLinkColor: '#89b4fa',
        textColor: '#cdd6f4',
        titleColor: '#cdd6f4',
        border2: '#45475a',

        nodeBorder: '#cba6f7',
        nodeTextColor: '#cdd6f4',
        clusterBkg: '#181825',
        clusterBorder: '#45475a',
        nodeBkg: '#313244',
        edgeLabelBackground: '#181825',
        labelTextColor: '#cdd6f4',
        labelBackgroundColor: '#181825',
        labelBoxBkgColor: '#313244',
        labelBoxBorderColor: '#cba6f7',
        scaleLabelColor: '#cdd6f4',

        actorBkg: '#313244',
        actorBorder: '#cba6f7',
        actorTextColor: '#cdd6f4',
        actorLineColor: '#6c7086',
        signalColor: '#cdd6f4',
        signalTextColor: '#cdd6f4',
        messageTextColor: '#cdd6f4',
        loopTextColor: '#cdd6f4',
        noteBkgColor: '#45475a',
        noteBorderColor: '#f9e2af',
        noteTextColor: '#cdd6f4',
        activationBkgColor: '#45475a',
        activationBorderColor: '#cba6f7',
        sequenceNumberColor: '#11111b',
        altBackground: '#181825',

        stateBkg: '#313244',
        stateLabelColor: '#cdd6f4',
        transitionColor: '#89b4fa',
        transitionLabelColor: '#cdd6f4',
        compositeBackground: '#181825',
        compositeBorder: '#45475a',
        compositeTitleBackground: '#313244',
        innerEndBackground: '#cba6f7',
        specialStateColor: '#cdd6f4',
        errorBkgColor: '#f38ba8',
        errorTextColor: '#11111b',

        cScale0: '#313244',  cScaleLabel0: '#cdd6f4',
        cScale1: '#45475a',  cScaleLabel1: '#cdd6f4',
        cScale2: '#181825',  cScaleLabel2: '#cdd6f4',
        cScale3: '#313244',  cScaleLabel3: '#cdd6f4',
        cScale4: '#45475a',  cScaleLabel4: '#cdd6f4',
        cScale5: '#181825',  cScaleLabel5: '#cdd6f4',
        cScale6: '#313244',  cScaleLabel6: '#cdd6f4',
        cScale7: '#45475a',  cScaleLabel7: '#cdd6f4',
        cScale8: '#181825',  cScaleLabel8: '#cdd6f4',
        cScale9: '#313244',  cScaleLabel9: '#cdd6f4',
        cScale10: '#45475a', cScaleLabel10: '#cdd6f4',
        cScale11: '#181825', cScaleLabel11: '#cdd6f4',

        cScalePeer0: '#cba6f7', cScalePeer1: '#89b4fa', cScalePeer2: '#a6e3a1',
        cScalePeer3: '#fab387', cScalePeer4: '#f5c2e7', cScalePeer5: '#94e2d5',
        cScalePeer6: '#f9e2af', cScalePeer7: '#b4befe', cScalePeer8: '#74c7ec',
        cScalePeer9: '#eba0ac', cScalePeer10: '#cba6f7', cScalePeer11: '#89b4fa',

        git0: '#cba6f7', git1: '#89b4fa', git2: '#a6e3a1', git3: '#fab387',
        git4: '#f5c2e7', git5: '#94e2d5', git6: '#f9e2af', git7: '#b4befe',
        gitBranchLabel0: '#11111b', gitBranchLabel1: '#11111b',
        gitBranchLabel2: '#11111b', gitBranchLabel3: '#11111b',
        gitBranchLabel4: '#11111b', gitBranchLabel5: '#11111b',
        gitBranchLabel6: '#11111b', gitBranchLabel7: '#11111b',
      },
    });
  }

  try { await mermaid.run({ nodes, suppressErrors: true }); } catch (e) { console.warn('mermaid', e); }
}

document.addEventListener('astro:page-load', pintar);
