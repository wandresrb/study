// @ts-check
// Compila las lecciones con el mismo par de plugins que astro.config.mjs para
// que una fórmula rota se vea aquí en un segundo y no tras un build de 5.000
// páginas. Sin argumento recorre todos los tracks.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compile } from '@mdx-js/mdx';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const GUIDE = 'src/content/guide';
const only = process.argv[2];

const dirs = (await readdir(GUIDE, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && (!only || d.name === only))
  .map((d) => d.name);

let files = 0;
let failed = 0;
for (const track of dirs) {
  for (const name of (await readdir(join(GUIDE, track))).filter((f) => f.endsWith('.mdx'))) {
    const path = join(GUIDE, track, name);
    files++;
    try {
      await compile(await readFile(path, 'utf8'), {
        remarkPlugins: [remarkMath],
        rehypePlugins: [[rehypeKatex, { throwOnError: true, strict: 'error' }]],
      });
    } catch (err) {
      failed++;
      console.error(`✗ ${path}\n  ${String(err instanceof Error ? err.message : err).split('\n')[0]}`);
    }
  }
}

console.log(`${failed ? '✗' : '✓'} ${files} lecciones · ${failed} con la notación rota`);
process.exit(failed ? 1 : 0);
