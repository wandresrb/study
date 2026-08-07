// Inicialización y tema de Mermaid.
//
// Vive en public/ y NO en el layout a propósito. Antes eran 4930 bytes de
// `is:inline` copiados en cada una de las 5074 páginas —unos 24 MB de HTML sin
// minificar ni compartir—, cuando solo el 70% de las lecciones tiene diagrama.
// Aquí el navegador lo descarga una vez y lo cachea para todo el sitio.
//
// Se engancha a `astro:page-load` porque con <ClientRouter /> los módulos no
// se re-ejecutan al navegar: sin eso, los diagramas de la segunda lección en
// adelante no se pintarían. El módulo de mermaid se importa una sola vez.
//
// Está en public/ y no en src/ porque el import dinámico apunta a una URL de
// CDN: Vite no la puede resolver, y los ficheros de public/ se sirven tal cual.
let mermaid = null;

async function pintar() {
  const nodes = document.querySelectorAll('pre.mermaid:not([data-procesado])');
  if (!nodes.length) return;
  nodes.forEach((n) => n.setAttribute('data-procesado', ''));

  if (!mermaid) {
    ({ default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'));
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      fontFamily: 'JetBrains Mono, monospace',
      themeVariables: {
        darkMode: true,
        fontSize: '14px',

        /* --- Base --- */
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

        /* --- Nodos y clusters (flowchart) --- */
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
        /* scaleLabelColor alimenta todos los cScaleLabel de mindmap
           y timeline: vale como red de seguridad si aparece un indice
           por encima de los que definimos abajo. */
        scaleLabelColor: '#cdd6f4',

        /* --- Diagramas de secuencia --- */
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

        /* --- Diagramas de estado ---
           OJO: en el tema base de Mermaid, stateLabelColor cae a
           stateBkg ANTES que a primaryTextColor. Es decir, sin este
           override el texto toma el color de su propio fondo. */
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

        /* --- Mindmap y timeline: escalas y SUS etiquetas --- */
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

        /* Bordes de las secciones del mindmap: aquí sí va el color */
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

  try { await mermaid.run({ nodes }); } catch (e) { console.warn('mermaid', e); }
}

// Dispara en la carga inicial y tras cada transicion de ClientRouter.
document.addEventListener('astro:page-load', pintar);
