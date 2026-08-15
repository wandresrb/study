import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const GUIDE = 'src/content/guia';
const ICONS = 'src/lib/icons.ts';
const DB = 'db/catalog.db';

const COMPONENTS = new Set([
  'Callout', 'KeyCap', 'Kbd', 'Mermaid', 'Cards', 'Card', 'PluginCard',
  'Objetivos', 'Reto', 'Lead', 'Drill', 'Paso', 'Instalar',
  'Predict', 'ModeMap', 'KeyboardMap', 'Pipeline',
  'UndoTree', 'WindowLayout', 'CommandAnatomy',
  'Fragment',
]);

// A `style X fill:#hex` wins over the themeVariables lib/mermaid.ts derives from
// the tokens, so the diagram renders in another theme's palette. Color comes from
// the theme, never from the content. neovim is the debt still to be cleaned.
const MERMAID_BLOCK = /<Mermaid\s+code=\{`([\s\S]*?)`\}/g;
const MERMAID_HEX = /^\s*style\s+\S+.*#[0-9a-fA-F]{3,8}/;
const HEX_DEBT = new Set(['neovim']);

const errors = [];
const warnings = [];
const fail = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

function frontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  const data = {};
  for (const line of text.slice(4, end).split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  return data;
}

// build-db valida la estructura (tracks, niveles, referencias del frontmatter)
// y deja la base que este script consulta; si falla, su mensaje ya dice qué.
const built = spawnSync(process.execPath, ['scripts/build-db.mjs'], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
if (built.status !== 0) {
  console.error('✗ build-db falló: la estructura no valida (el mensaje de arriba dice dónde)');
  process.exit(1);
}

const db = new DatabaseSync(DB, { readOnly: true });
const tracks = new Set(db.prepare('SELECT id FROM track').all().map((r) => String(r.id)));
const levelNames = new Map();
for (const r of db.prepare('SELECT track, idx, name FROM level').all()) {
  if (!levelNames.has(r.track)) levelNames.set(r.track, new Map());
  levelNames.get(r.track).set(Number(r.idx), String(r.name));
}

const onlyTrack = process.argv[2];
const folders = (await readdir(GUIDE, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && (!onlyTrack || d.name === onlyTrack))
  .map((d) => d.name);

for (const loose of (await readdir(GUIDE, { withFileTypes: true })).filter((d) => d.isFile())) {
  fail(GUIDE, `"${loose.name}" está en la raíz; cada track va en su carpeta`);
}

let total = 0;

for (const track of folders) {
  const dir = join(GUIDE, track);
  if (!tracks.has(track)) fail(dir, `no existe el track "${track}" en db/seeds/03-tracks.sql`);

  const levels = levelNames.get(track);
  if (!levels) {
    fail(dir, 'el track no tiene niveles en db/seeds/04-levels.sql');
    continue;
  }

  const lessons = [];
  let hexLines = 0;
  let hexFiles = 0;
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.mdx'))) {
    const path = join(dir, f);
    const text = await readFile(path, 'utf8');
    const fm = frontmatter(text);
    total++;
    if (!fm) { fail(path, 'sin frontmatter'); continue; }

    for (const field of ['title', 'description', 'subject', 'level', 'order', 'posicion']) {
      if (!fm[field]) fail(path, `falta "${field}"`);
    }
    if (fm.subject && fm.subject !== track) {
      fail(path, `subject "${fm.subject}" no coincide con la carpeta "${track}"`);
    }
    if (fm.posicion && !/^\d+(\.\d+)?$/.test(fm.posicion)) {
      fail(path, `posicion "${fm.posicion}" no tiene la forma «17» o «17.5»`);
    }
    const level = Number(fm.level);
    const order = Number(fm.order);
    if (!Number.isInteger(level) || level < 0) fail(path, `level "${fm.level}" inválido`);
    else if (!levels.has(level)) fail(path, `level ${level} no existe en db/seeds/04-levels.sql`);
    if (!Number.isInteger(order) || order < 1) fail(path, `order "${fm.order}" inválido`);
    if (fm.posicion && fm.posicion !== `${level}.${order}`) {
      warn(path, `posicion "${fm.posicion}" debería ser "${level}.${order}"`);
    }

    let prose = text
      .slice(text.indexOf('\n---', 4) + 4)
      .replace(/^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1/gm, '')
      .replace(/`[^`\n]*`/g, '');
    // Las expresiones JSX ({'ci"<Esc>'}, opciones={[…]}) son JS, no marcado:
    // un <Esc> ahí dentro es texto. Se pelan de dentro afuera.
    for (let i = 0; i < 6; i++) prose = prose.replace(/\{[^{}]*\}/g, '');
    for (const [, tag] of prose.matchAll(/<([A-Z]\w*)[\s/>]/g)) {
      if (!COMPONENTS.has(tag)) fail(path, `<${tag}> no está registrado en guide/[...slug].astro`);
    }

    const hex = [...text.matchAll(MERMAID_BLOCK)]
      .flatMap(([, code]) => code.split('\n'))
      .filter((line) => MERMAID_HEX.test(line)).length;
    if (hex) {
      hexLines += hex;
      hexFiles += 1;
      if (!HEX_DEBT.has(track)) {
        fail(path, `${hex} línea(s) "style … fill:#hex" en un <Mermaid>: el color lo pone el tema`);
      }
    }

    lessons.push({ path, level, order });
  }

  if (hexLines && HEX_DEBT.has(track)) {
    warn(dir, `${hexLines} "style … fill:#hex" en ${hexFiles} lecciones: deuda pendiente de limpiar`);
  }

  const seen = new Map();
  for (const l of lessons) {
    const key = `${l.level}.${l.order}`;
    if (seen.has(key)) fail(l.path, `level.order ${key} duplicado con ${seen.get(key)}`);
    else seen.set(key, basename(l.path));
  }

  for (const n of [...levels.keys()].sort((a, b) => a - b)) {
    const orders = lessons.filter((l) => l.level === n).map((l) => l.order).sort((a, b) => a - b);
    if (orders.length === 0) { warn(dir, `el nivel ${n} ("${levels.get(n)}") no tiene lecciones`); continue; }
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) { fail(dir, `nivel ${n}: la numeración salta (${orders.join(',')})`); break; }
    }
  }
}

{
  const source = await readFile(ICONS, 'utf8');
  const map = /const TRACK_ICON[^{]*\{([\s\S]*?)^\};/m.exec(source);
  if (!map) fail(ICONS, 'no se encuentra el objeto TRACK_ICON');
  else {
    const keys = new Set([...map[1].matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));
    for (const t of tracks) {
      if (!keys.has(t)) fail(ICONS, `el track "${t}" no tiene icono en TRACK_ICON`);
    }
    for (const k of keys) {
      if (!tracks.has(k)) fail(ICONS, `"${k}" tiene icono pero no existe en db/seeds/03-tracks.sql`);
    }
  }
}

for (const m of errors) console.error(`✗ ${m}`);
for (const m of warnings) console.warn(`⚠ ${m}`);
console.log(
  `\n${total} lecciones en ${folders.length} tracks · ${errors.length} errores · ${warnings.length} avisos`,
);
process.exit(errors.length ? 1 : 0);
