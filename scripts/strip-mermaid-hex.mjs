// A `style X fill:#hex` line in the content wins over the themeVariables that
// lib/mermaid.ts derives from the active theme's tokens, so any lesson carrying
// one paints its diagram with another theme's palette. This strips them.
//
// Usage: node scripts/strip-mermaid-hex.mjs [track] [--write] [--skip=a,b]
// Measures only by default; --write applies.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GUIDE = 'src/content/guia';

// One single invocation form across the 5,088 lessons: <Mermaid code={`...`}
const BLOCK = /<Mermaid\s+code=\{`([\s\S]*?)`\}/g;
const STYLED = /^[ \t]*style\s+\S+.*#[0-9a-fA-F]{3,8}.*$/;

const args = process.argv.slice(2);
const write = args.includes('--write');
const only = args.find((a) => !a.startsWith('--')) ?? null;
const skip = new Set(
  args
    .filter((a) => a.startsWith('--skip='))
    .flatMap((a) => a.slice('--skip='.length).split(',').filter(Boolean)),
);

function lessons(dir, track = null) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (track === null && (skip.has(name) || (only && name !== only))) continue;
      out.push(...lessons(path, track ?? name));
    } else if (name.endsWith('.mdx')) {
      out.push({ path, track: track ?? '?' });
    }
  }
  return out;
}

const perTrack = new Map();
let files = 0;
let blocks = 0;
let stripped = 0;
let touched = 0;
let emptied = 0;

for (const { path, track } of lessons(GUIDE)) {
  files += 1;
  const before = readFileSync(path, 'utf8');
  let removedHere = 0;

  const after = before.replace(BLOCK, (whole, code) => {
    blocks += 1;
    const kept = code.split('\n').filter((line) => {
      if (!STYLED.test(line)) return true;
      removedHere += 1;
      return false;
    });
    // A block must keep a diagram: if it held nothing but styles, leave it be.
    if (!kept.some((l) => l.trim())) {
      emptied += 1;
      return whole;
    }
    while (kept.length > 1 && !kept[kept.length - 1].trim()) kept.pop();
    return whole.replace(code, kept.join('\n'));
  });

  if (!removedHere) continue;
  stripped += removedHere;
  touched += 1;
  perTrack.set(track, (perTrack.get(track) ?? 0) + removedHere);
  if (write) writeFileSync(path, after);
}

const rows = [...perTrack].sort((a, b) => b[1] - a[1]);
for (const [track, n] of rows) console.log(`  ${String(n).padStart(5)}  ${track}`);

console.log(
  `\n${files} lecciones · ${blocks} bloques mermaid · ${stripped} lineas de estilo en ${touched} ficheros`,
);
if (emptied) console.log(`${emptied} bloques se dejaron intactos: solo tenian estilos`);
if (skip.size) console.log(`tracks excluidos: ${[...skip].join(', ')}`);
console.log(write ? 'escrito' : 'simulacion — pasa --write para aplicar');
