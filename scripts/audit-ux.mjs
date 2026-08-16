import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

// A UX/UI audit the repo can re-run: it drives a headless Chromium over one page
// per archetype and measures what a reviewer would otherwise eyeball by hand.
// Findings are evidence, not verdicts — density and tone stay the author's call.

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:4321';

// One route per page archetype. `bun run audit:ux /some/path/` overrides this.
const ROUTES = [
  '/',
  '/cs/',
  '/neovim/',
  '/guide/neovim/modelo-modal/',
  '/neovim/cheatsheet/',
  '/config/',
  '/resources/',
  '/about/',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'movil', width: 390, height: 844 },
];

// WCAG 2.2: 4.5:1 for body text, 3:1 once it is large (24px, or 18.66px bold),
// and 24x24 CSS px as the minimum target size (2.5.8 AA).
const AA_TEXT = 4.5;
const AA_LARGE = 3;
const MIN_TARGET = 24;

/** Everything measurable in one DOM pass. Serialized into the page: no closures. */
function probe({ aaText, aaLarge, minTarget }) {
  const luminance = (color) => {
    const parts = color.match(/[\d.]+/g);
    if (!parts) return null;
    if (parts.length > 3 && Number(parts[3]) === 0) return null;
    const [r, g, b] = parts.slice(0, 3).map((value) => {
      const channel = Number(value) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // Walk up for the first painted background. A gradient leaves backgroundColor
  // transparent, so a naive walk-up would compare the text against an ancestor
  // it never sits on — that alone invented a 1.05:1 on a button that reads at
  // 8.7:1. Sample the gradient stops and let the caller take the worst.
  const backdrops = (node) => {
    for (let el = node; el; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.backgroundImage && style.backgroundImage !== 'none') {
        const stops = (style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).filter(
          (c) => luminance(c) !== null,
        );
        if (stops.length) return stops;
      }
      const bg = style.backgroundColor;
      if (bg && luminance(bg) !== null) return [bg];
    }
    return ['rgb(0, 0, 0)'];
  };

  const contrast = (fg, bg) => {
    const a = luminance(fg);
    const b = luminance(bg);
    if (a === null || b === null) return null;
    return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
  };

  // textContent, not just innerText: a control inside a closed <details> or a
  // collapsed menu renders nothing but still has a perfectly good name.
  const label = (el) =>
    (el.innerText || '').trim() ||
    (el.textContent || '').trim() ||
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (el.querySelector('img')?.alt ?? '') ||
    (el.querySelector('svg title')?.textContent ?? '');

  // Only judge what the user can actually see: hidden controls have no ring to
  // show and no target to hit, so counting them manufactures findings.
  const visible = (el) =>
    typeof el.checkVisibility === 'function'
      ? el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })
      : el.getBoundingClientRect().width > 0;

  const where = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls.trim().split(/\s+/)[0]}` : ''}`;
  };

  const painted = [...document.querySelectorAll('body *')].filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const withText = painted.filter((el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()),
  );

  // — Structure: the skeleton a screen reader and a skimming eye both rely on.
  const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
  const skipped = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) skipped.push(`h${levels[i - 1]} → h${levels[i]}`);
  }
  const structure = {
    lang: document.documentElement.lang || null,
    titleLength: document.title.length,
    metaDescription: document.querySelector('meta[name="description"]')?.content?.length ?? 0,
    h1: document.querySelectorAll('h1').length,
    skippedLevels: skipped,
    landmarks: Object.fromEntries(
      ['header', 'nav', 'main', 'aside', 'footer'].map((t) => [t, document.querySelectorAll(t).length]),
    ),
    skipLink: !!document.querySelector(
      'a[href^="#"][class*="skip"], a[href="#main"], a[href="#content"], a[href="#contenido"]',
    ),
  };

  // — Controls: name, size, labelling.
  const controls = [...document.querySelectorAll('a, button, [role="button"], input, select, textarea')];
  const unnamed = [];
  const tooSmall = [];
  for (const el of controls) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || !visible(el)) continue;
    const interactive = /^(A|BUTTON)$/.test(el.tagName) || el.getAttribute('role') === 'button';
    if (interactive && !label(el)) unnamed.push({ at: where(el), href: el.getAttribute('href') });
    // A 1x1 box is a visually-hidden control (skip link, sr-only): it is not a
    // target the pointer is meant to hit, so size rules do not apply to it.
    if (rect.width <= 1 && rect.height <= 1) continue;
    if (rect.width < minTarget || rect.height < minTarget) {
      tooSmall.push({ at: where(el), w: Math.round(rect.width), h: Math.round(rect.height), text: label(el).slice(0, 24) });
    }
  }

  // — Contrast.
  const contrastFails = [];
  for (const el of withText) {
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.opacity === '0') continue;
    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const ratios = backdrops(el)
      .map((bg) => contrast(style.color, bg))
      .filter((r) => r !== null);
    if (!ratios.length) continue;
    const ratio = Math.min(...ratios);
    const floor = large ? aaLarge : aaText;
    if (ratio < floor) {
      contrastFails.push({
        ratio,
        needs: floor,
        size: Number(size.toFixed(1)),
        at: where(el),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
  }

  // — Typography: which faces are loaded, which are actually asked for, and
  // where the browser has to synthesise a weight or a slant it does not have.
  const loaded = [...document.fonts].map((f) => ({
    family: f.family.replace(/["']/g, ''),
    weight: f.weight,
    style: f.style,
    status: f.status,
  }));
  const used = new Map();
  for (const el of withText) {
    const style = getComputedStyle(el);
    const family = style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const key = `${family}|${style.fontWeight}|${style.fontStyle}`;
    const seen = used.get(key) ?? {
      family,
      weight: style.fontWeight,
      style: style.fontStyle,
      count: 0,
      sample: (el.innerText || '').trim().slice(0, 32),
    };
    seen.count++;
    used.set(key, seen);
  }
  // A face that failed to fetch also answers false to check(), which would read
  // as faux bold when the real story is "the font never arrived". Keep them
  // apart: one is a design bug, the other is a broken dev cache.
  const failed = loaded.filter((f) => f.status === 'error');
  const brokenFamilies = new Set(failed.map((f) => f.family));

  // document.fonts.check() is the browser's own answer to "can I render this
  // without faking it?" — the only reliable way to catch faux bold / faux italic.
  const synthesised = [];
  for (const entry of used.values()) {
    if (brokenFamilies.has(entry.family)) continue;
    const spec = `${entry.style} ${entry.weight} 16px "${entry.family}"`;
    let available = true;
    try {
      available = document.fonts.check(spec);
    } catch {
      available = true;
    }
    if (!available) synthesised.push({ ...entry, spec });
  }

  // — Design system drift: how many distinct values the page actually paints.
  const sets = { size: new Set(), weight: new Set(), tracking: new Set(), leading: new Set(), radius: new Set(), shadow: new Set() };
  for (const el of painted) {
    const style = getComputedStyle(el);
    if ((el.innerText || '').trim()) {
      sets.size.add(style.fontSize);
      sets.weight.add(style.fontWeight);
      sets.tracking.add(style.letterSpacing);
      sets.leading.add(style.lineHeight);
    }
    if (style.borderRadius !== '0px') sets.radius.add(style.borderRadius);
    if (style.boxShadow !== 'none') sets.shadow.add(style.boxShadow);
  }

  // — Reading column: the measure only means something next to its own font size.
  const column = (() => {
    const host = document.querySelector('.prose') || document.querySelector('article') || document.querySelector('main');
    if (!host) return null;
    const style = getComputedStyle(host);
    const ruler = document.createElement('span');
    ruler.textContent = '0';
    ruler.style.cssText = 'position:absolute;visibility:hidden';
    host.appendChild(ruler);
    const ch = ruler.getBoundingClientRect().width;
    ruler.remove();
    const width = host.getBoundingClientRect().width;
    return {
      widthPx: Number(width.toFixed(1)),
      measureCh: ch ? Number((width / ch).toFixed(1)) : null,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      ratio: Number((parseFloat(style.lineHeight) / parseFloat(style.fontSize)).toFixed(2)),
    };
  })();

  // — Overflow: a page that scrolls sideways is broken, not dense.
  const overflow = [];
  const limit = document.documentElement.clientWidth;
  for (const el of painted) {
    const rect = el.getBoundingClientRect();
    if (rect.right > limit + 1 && rect.width <= limit) overflow.push({ at: where(el), right: Math.round(rect.right) });
  }

  return {
    structure,
    controls: {
      total: controls.length,
      unnamed,
      tooSmall,
      inputsWithoutLabel: [...document.querySelectorAll('input, textarea, select')].filter(
        (i) => !i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby'),
      ).length,
      imagesWithoutAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    },
    contrast: { measured: withText.length, fails: contrastFails.sort((a, b) => a.ratio - b.ratio) },
    typography: {
      loaded,
      failed,
      used: [...used.values()].sort((a, b) => b.count - a.count),
      synthesised,
      column,
    },
    system: {
      sizes: sets.size.size,
      weights: [...sets.weight].sort(),
      trackings: sets.tracking.size,
      leadings: sets.leading.size,
      radii: sets.radius.size,
      shadows: sets.shadow.size,
      inlineStyled: document.querySelectorAll('[style]').length,
    },
    overflow: overflow.slice(0, 10),
    documentHeight: document.documentElement.scrollHeight,
  };
}

/**
 * Real Tab presses, not el.focus(): `:focus-visible` only matches keyboard
 * focus, so a programmatic focus reports every control as ringless — which is
 * exactly the false positive this replaced.
 */
async function focusRing(page, sample = 25) {
  const invisible = [];
  const seen = new Set();
  let checked = 0;
  for (let i = 0; i < sample; i++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      // The Astro dev toolbar is not part of the site.
      if (el.tagName.toLowerCase().startsWith('astro-')) return null;
      const s = getComputedStyle(el);
      const cls = typeof el.className === 'string' ? el.className : '';
      const outlined = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const shadowed = s.boxShadow !== 'none';
      return {
        at: `${el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/)[0]}` : ''}`,
        ringed: outlined || shadowed,
      };
    });
    if (!hit) continue;
    checked++;
    if (!hit.ringed && !seen.has(hit.at)) {
      seen.add(hit.at);
      invisible.push(hit.at);
    }
  }
  return { checked, invisible };
}

const bullet = (n, one, many) => `${n} ${n === 1 ? one : many}`;

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = outIndex === -1 ? null : args[outIndex + 1];
  const routes = args.filter((a, i) => a.startsWith('/') && i !== outIndex + 1);
  const targets = routes.length ? routes : ROUTES;

  try {
    const ping = await fetch(BASE, { signal: AbortSignal.timeout(4000) });
    if (!ping.ok) throw new Error(`HTTP ${ping.status}`);
  } catch (error) {
    console.error(`No hay servidor en ${BASE} (${error.message}). Arranca 'bun dev' o exporta AUDIT_BASE.`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const report = { base: BASE, pages: [] };

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    for (const route of targets) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 120)));
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 120)}`));
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        const data = await page.evaluate(probe, { aaText: AA_TEXT, aaLarge: AA_LARGE, minTarget: MIN_TARGET });
        data.focus = await focusRing(page);
        report.pages.push({ route, viewport: viewport.name, consoleErrors, ...data });
      } catch (error) {
        report.pages.push({ route, viewport: viewport.name, error: error.message.split('\n')[0] });
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();

  for (const page of report.pages) {
    const head = `${page.route}  [${page.viewport}]`;
    if (page.error) {
      console.log(`\n${head}\n  ERROR  ${page.error}`);
      continue;
    }
    const lines = [];
    const s = page.structure;
    if (!s.lang) lines.push('sin atributo lang en <html>');
    if (s.h1 !== 1) lines.push(`${s.h1} elementos h1 (debe haber 1)`);
    if (s.skippedLevels.length) lines.push(`saltos de encabezado: ${s.skippedLevels.join(', ')}`);
    if (!s.landmarks.main) lines.push('sin <main>');
    if (!s.skipLink) lines.push('sin enlace de salto al contenido');
    if (!s.metaDescription) lines.push('sin meta description');
    if (page.controls.unnamed.length) {
      lines.push(`${bullet(page.controls.unnamed.length, 'control sin nombre accesible', 'controles sin nombre accesible')}: ${page.controls.unnamed.slice(0, 3).map((u) => u.at).join(', ')}`);
    }
    if (page.controls.tooSmall.length) {
      lines.push(`${bullet(page.controls.tooSmall.length, 'objetivo táctil', 'objetivos táctiles')} bajo ${MIN_TARGET}px: ${page.controls.tooSmall.slice(0, 3).map((t) => `${t.at} ${t.w}×${t.h}`).join(', ')}`);
    }
    if (page.controls.imagesWithoutAlt) lines.push(`${page.controls.imagesWithoutAlt} imágenes sin alt`);
    if (page.controls.inputsWithoutLabel) lines.push(`${page.controls.inputsWithoutLabel} campos sin etiqueta`);
    if (page.contrast.fails.length) {
      const worst = page.contrast.fails[0];
      lines.push(`contraste: ${page.contrast.fails.length}/${page.contrast.measured} bajo AA (peor ${worst.ratio}:1 en ${worst.at} «${worst.text}»)`);
    }
    if (page.typography.failed.length) {
      const families = [...new Set(page.typography.failed.map((f) => f.family))];
      lines.push(`${page.typography.failed.length} caras no cargaron (${families.join(', ')}) — suele ser la caché de dev, no el sitio`);
    }
    if (page.typography.synthesised.length) {
      lines.push(`tipografía sintetizada (faux bold/italic): ${page.typography.synthesised.map((f) => `${f.family} ${f.weight} ${f.style}`).join(', ')}`);
    }
    if (page.focus.invisible.length) {
      lines.push(`${bullet(page.focus.invisible.length, 'control', 'controles')} sin foco visible de ${page.focus.checked} probados: ${[...new Set(page.focus.invisible)].slice(0, 3).join(', ')}`);
    }
    if (page.overflow.length) lines.push(`${page.overflow.length} elementos desbordan a la derecha: ${page.overflow.slice(0, 2).map((o) => o.at).join(', ')}`);
    if (page.consoleErrors.length) lines.push(`consola: ${page.consoleErrors.length} errores — ${page.consoleErrors[0]}`);

    const sys = page.system;
    console.log(`\n${head}`);
    console.log(`  sistema: ${sys.sizes} tamaños · pesos ${sys.weights.join('/')} · ${sys.leadings} interlineados · ${sys.radii} radios · ${sys.shadows} sombras · ${sys.inlineStyled} nodos con style=`);
    if (page.typography.column) {
      const c = page.typography.column;
      console.log(`  lectura: ${c.fontSize}/${c.lineHeight} (${c.ratio}) · medida ${c.measureCh} caracteres · alto ${page.documentHeight}px`);
    }
    console.log(lines.length ? lines.map((l) => `  · ${l}`).join('\n') : '  sin hallazgos');
  }

  const fails = report.pages.reduce((n, p) => n + (p.contrast?.fails.length ?? 0), 0);
  const unnamed = report.pages.reduce((n, p) => n + (p.controls?.unnamed.length ?? 0), 0);
  const faux = report.pages.reduce((n, p) => n + (p.typography?.synthesised.length ?? 0), 0);
  console.log(
    `\n${report.pages.length} vistas · ${fails} textos bajo AA · ${unnamed} controles sin nombre · ${faux} variantes tipográficas sintetizadas`,
  );

  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(report, null, 2));
    console.log(`Informe completo en ${out}`);
  }
}

await main();
