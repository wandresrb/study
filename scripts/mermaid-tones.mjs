// Restores the meaning the colors carried, without the hex that carried it.
//
// strip-mermaid-hex removed `style X fill:#hex` because those hex were another
// theme's palette. The distinction they encoded was worth keeping, so this reads
// the diagrams as they were BEFORE that commit, maps each hex to a token name and
// writes `class X t-<tone>` instead. prose.css paints the tone from the tokens,
// so it follows the active theme. Mermaid tolerates a class it never defines.
//
// Usage: node scripts/mermaid-tones.mjs [track] [--write] [--from=<commit>]
// Measures only by default; --write applies. Git is read-only here.

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GUIDE = 'src/content/guia';
const BLOCK = /<Mermaid\s+code=\{`([\s\S]*?)`\}/g;
const STYLE = /^[ \t]*style\s+(\S+)\s+(.*)$/;

// The 15 hex the content used were Catppuccin Mocha, one for one.
const TONE = {
  '#f5e0dc': 'rosewater',
  '#f2cdcd': 'flamingo',
  '#f5c2e7': 'pink',
  '#cba6f7': 'mauve',
  '#f38ba8': 'red',
  '#eba0ac': 'maroon',
  '#fab387': 'peach',
  '#f9e2af': 'yellow',
  '#a6e3a1': 'green',
  '#94e2d5': 'teal',
  '#89dceb': 'sky',
  '#74c7ec': 'sapphire',
  '#89b4fa': 'blue',
  '#b4befe': 'lavender',
  // Surfaces and overlays were never an accent: they meant "dimmed".
  '#313244': 'muted',
  '#45475a': 'muted',
  '#585b70': 'muted',
  '#6c7086': 'muted',
  '#7f849c': 'muted',
};

const args = process.argv.slice(2);
const write = args.includes('--write');
const only = args.find((a) => !a.startsWith('--')) ?? null;
const from = (args.find((a) => a.startsWith('--from=')) ?? '--from=3baac347').slice('--from='.length);

function lessons(dir, track = null) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (track === null && only && name !== only) continue;
      out.push(...lessons(path, track ?? name));
    } else if (name.endsWith('.mdx')) {
      out.push({ path, track: track ?? '?' });
    }
  }
  return out;
}

/** `style recalc fill:#89b4fa,color:#11111b` → { node: 'recalc', tone: 'blue' } */
function toneOf(line) {
  const m = STYLE.exec(line);
  if (!m) return null;
  const fill = /fill:\s*(#[0-9a-fA-F]{3,8})/.exec(m[2]);
  if (!fill) return null;
  const tone = TONE[fill[1].toLowerCase()];
  return tone ? { node: m[1], tone } : { node: m[1], tone: null, hex: fill[1] };
}

const perTrack = new Map();
const unknown = new Map();
let touched = 0;
let applied = 0;
let skipped = 0;

for (const { path, track } of lessons(GUIDE)) {
  let before;
  try {
    before = execSync(`git show ${from}~1:${path}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    continue; // the file did not exist back then
  }
  const now = readFileSync(path, 'utf8');

  const old = [...before.matchAll(BLOCK)];
  const cur = [...now.matchAll(BLOCK)];
  // Only pair blocks when the file still has the same ones; anything else is
  // content that moved since, and guessing the pairing would corrupt it.
  if (!old.length || old.length !== cur.length) {
    if (old.some(([, c]) => c.split('\n').some((l) => STYLE.test(l)))) skipped += 1;
    continue;
  }

  let i = -1;
  let addedHere = 0;
  const after = now.replace(BLOCK, (whole, code) => {
    i += 1;
    const tones = old[i][1]
      .split('\n')
      .map(toneOf)
      .filter(Boolean);
    if (!tones.length) return whole;
    for (const t of tones) {
      if (!t.tone) {
        unknown.set(t.hex, (unknown.get(t.hex) ?? 0) + 1);
        continue;
      }
    }
    const lines = tones.filter((t) => t.tone).map((t) => `  class ${t.node} t-${t.tone}`);
    if (!lines.length) return whole;
    // Idempotent: a block that already carries its classes is left alone.
    if (/^\s*class\s+\S+\s+t-/m.test(code)) return whole;
    // A block that still holds its hex was never stripped (neovim is in flight):
    // adding a class there would lose to Mermaid's inline !important anyway.
    if (/^\s*style\s+\S+.*#[0-9a-fA-F]{3,8}/m.test(code)) return whole;
    addedHere += lines.length;
    return whole.replace(code, `${code.replace(/\s+$/, '')}\n${lines.join('\n')}`);
  });

  if (!addedHere) continue;
  applied += addedHere;
  touched += 1;
  perTrack.set(track, (perTrack.get(track) ?? 0) + addedHere);
  if (write) writeFileSync(path, after);
}

for (const [track, n] of [...perTrack].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${track}`);
}
console.log(`\n${applied} tonos en ${touched} lecciones · origen ${from}~1`);
if (skipped) console.log(`${skipped} lecciones saltadas: sus bloques ya no se corresponden`);
if (unknown.size) console.log(`hex sin tono: ${[...unknown].map(([h, n]) => `${h}×${n}`).join(', ')}`);
console.log(write ? 'escrito' : 'simulacion — pasa --write para aplicar');
