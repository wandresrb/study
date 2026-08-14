// @ts-check
// Regenerates src/styles/katex.css from the installed katex package: drops the
// woff and ttf sources (900 KB no live browser needs) and points the woff2 at
// public/katex/fonts/. Run it after bumping katex.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'node_modules/katex/dist';
const FONTS = 'public/katex/fonts';
const SHEET = 'src/styles/katex.css';

const { version } = JSON.parse(await readFile('node_modules/katex/package.json', 'utf8'));

await mkdir(FONTS, { recursive: true });
const woff2 = (await readdir(join(DIST, 'fonts'))).filter((f) => f.endsWith('.woff2'));
for (const font of woff2) await copyFile(join(DIST, 'fonts', font), join(FONTS, font));

const css = (await readFile(join(DIST, 'katex.min.css'), 'utf8'))
  .replace(/src:([^;}]*)/g, (_, srcs) => {
    const kept = srcs.split(/,(?![^()]*\))/).filter((/** @type {string} */ s) => s.includes('woff2'));
    return `src:${kept.join(',')}`;
  })
  .replace(/url\(fonts\//g, 'url(/katex/fonts/');

const header =
  `/* KaTeX ${version}, vendorizada: solo woff2 y con las\n` +
  `   fuentes servidas desde /katex/fonts/. Regenerar con scripts/vendor-katex.mjs. */\n`;

await writeFile(SHEET, header + css + '\n');
console.log(`${SHEET}  ${(css.length / 1024).toFixed(1)} KB · ${woff2.length} fuentes en ${FONTS}`);
