import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, renameSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const GUIDE = 'src/content/guia';
const SCHEMA = 'db/schema.sql';
const SEEDS = 'db/seeds';
const OUT = 'db/catalog.db';

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function frontmatter(file) {
  const head = readFileSync(file, 'utf8').slice(0, 4000);
  if (!head.startsWith('---')) throw new Error(`${file}: no frontmatter`);
  const end = head.indexOf('\n---', 3);
  if (end < 0) throw new Error(`${file}: frontmatter is not closed within 4 KB`);

  const data = {};
  for (const line of head.slice(4, end).split('\n')) {
    const m = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"') && v.length > 1) ||
      (v.startsWith("'") && v.endsWith("'") && v.length > 1)
    ) {
      v = v.slice(1, -1).replace(/\\"/g, '"');
    }
    data[m[1]] = v;
  }
  return data;
}

function mdxFiles() {
  const out = [];
  for (const dir of readdirSync(GUIDE, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(GUIDE, dir.name))) {
      if (f.endsWith('.mdx')) out.push(join(GUIDE, dir.name, f));
    }
  }
  return out.sort();
}

if (!existsSync('db')) mkdirSync('db', { recursive: true });

// Build into a private temp file and rename at the end: two concurrent runs
// (a manual one and the dev server's watcher) must never write the same file,
// and readers keep their open handle across the atomic swap.
const TMP = `${OUT}.${process.pid}.tmp`;
rmSync(TMP, { force: true });

const db = new DatabaseSync(TMP);
db.exec('PRAGMA journal_mode = OFF');
db.exec(readFileSync(SCHEMA, 'utf8'));
for (const f of readdirSync(SEEDS).sort()) db.exec(readFileSync(join(SEEDS, f), 'utf8'));

const known = new Set(db.prepare("SELECT track || ':' || idx k FROM level").all().map((r) => r.k));
const insert = db.prepare(
  `INSERT INTO lesson (path, track, level, sort, position, title, description, minutes, search)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

const files = mdxFiles();
const problems = [];

db.exec('BEGIN');
for (const file of files) {
  const path = relative(GUIDE, file).replace(/\.mdx$/, '');
  const d = frontmatter(file);

  for (const field of ['title', 'description', 'subject', 'level', 'order', 'posicion']) {
    if (!d[field]) problems.push(`${path}: missing "${field}"`);
  }
  if (problems.length) continue;

  const level = Number(d.level);
  if (!known.has(`${d.subject}:${level}`)) {
    problems.push(`${path}: subject "${d.subject}" has no level ${level}`);
    continue;
  }

  const minutes = Number(/(\d+)/.exec(d.duracion ?? '')?.[1] ?? 0);
  insert.run(
    path,
    d.subject,
    level,
    Number(d.order),
    d.posicion,
    d.title,
    d.description,
    minutes,
    fold(`${d.title} ${d.description}`),
  );
}

if (problems.length) {
  db.exec('ROLLBACK');
  db.close();
  rmSync(TMP, { force: true });
  console.error(`${problems.length} problems:\n  ` + problems.slice(0, 20).join('\n  '));
  process.exit(1);
}
db.exec('COMMIT');

const bad = db.prepare('PRAGMA foreign_key_check').all();
if (bad.length) {
  console.error(`${bad.length} foreign key violations`, bad.slice(0, 5));
  process.exit(1);
}

db.exec('ANALYZE');
db.exec('VACUUM');

const n = (q) => db.prepare(q).get().n;
const summary =
  `${OUT}  ${(readFileSync(TMP).byteLength / 1024).toFixed(0)} KB · ` +
  `${n('SELECT count(*) n FROM track')} tracks · ${n('SELECT count(*) n FROM level')} levels · ` +
  `${n('SELECT count(*) n FROM lesson')} lessons · ${n('SELECT count(*) n FROM teaches')} teaches`;
db.close();
renameSync(TMP, OUT);
console.log(summary);
