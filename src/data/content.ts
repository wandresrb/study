import { DatabaseSync } from 'node:sqlite';

// Inlined by vite.define in astro.config.mjs: an absolute path anchored to the
// project root, valid in dev and inside the prerender bundle (where
// import.meta.url would point at dist/.prerender/).
const DB_PATH = import.meta.env.DB_PATH as string;

// In dev the catalog integration invalidates this module after regenerating the
// db; closing the previous connection keeps file descriptors from leaking.
const globals = globalThis as Record<string, unknown>;
if (globals.__catalogDb instanceof DatabaseSync) globals.__catalogDb.close();

const db = new DatabaseSync(DB_PATH, { readOnly: true });
globals.__catalogDb = db;

export type Stratum = 'concept' | 'implementation' | 'tool';
export type Status = 'written' | 'indexed' | 'planned';

export interface Level {
  idx: number;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  color: string;
  colorHex: string;
  digit: string;
}

export interface Track {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  colorHex: string;
  gradFrom: string;
  gradTo: string;
  status: Status;
  sort: number;
  category: string;
  ref: { config?: string; resources?: string };
  features: { icon: string; title: string; description: string }[];
  chips: { label: string; color: string }[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  gradFrom: string;
  gradTo: string;
  stratum: Stratum;
  sort: number;
}

export interface Lesson {
  id: string;
  track: string;
  level: number;
  sort: number;
  position: string;
  title: string;
  description: string;
  minutes: number;
}

const PALETTE = [
  'var(--green)',
  'var(--blue)',
  'var(--mauve)',
  'var(--sky)',
  'var(--peach)',
  'var(--teal)',
  'var(--yellow)',
  'var(--pink)',
  'var(--lavender)',
  'var(--sapphire)',
  'var(--maroon)',
];
const PALETTE_HEX = [
  '#a6e3a1',
  '#89b4fa',
  '#cba6f7',
  '#89dceb',
  '#fab387',
  '#94e2d5',
  '#f9e2af',
  '#f5c2e7',
  '#b4befe',
  '#74c7ec',
  '#eba0ac',
];

const qLevels = db.prepare(
  'SELECT idx, name, subtitle, description, color, color_hex, digit FROM level WHERE track = ? ORDER BY idx',
);
const qTags = db.prepare('SELECT idx, tag FROM tag WHERE track = ? ORDER BY idx, tag');
const qTracks = db.prepare('SELECT * FROM track ORDER BY sort');
const qTrack = db.prepare('SELECT * FROM track WHERE id = ?');
const qFeatures = db.prepare('SELECT icon, title, description FROM track_feature WHERE track = ? ORDER BY sort');
const qChips = db.prepare('SELECT label, color FROM track_chip WHERE track = ? ORDER BY sort');
const qCategories = db.prepare('SELECT * FROM category ORDER BY sort');
const qLessons = db.prepare(
  'SELECT path, track, level, sort, position, title, description, minutes FROM lesson WHERE track = ? ORDER BY level, sort',
);
const qStats = db.prepare(
  `SELECT count(*) lessons, coalesce(sum(minutes), 0) minutes
   FROM lesson WHERE track IN (SELECT id FROM track WHERE category = ? AND status = 'written')`,
);
const qStrata = db.prepare('SELECT id, name, sort FROM stratum ORDER BY sort');
const qTotals = db.prepare(
  `SELECT count(*) lessons, coalesce(sum(minutes), 0) minutes,
          (SELECT count(*) FROM track WHERE status = 'written') tracks
   FROM lesson`,
);
const qConceptCounts = db.prepare(
  `SELECT concept, count(*) AS edges, count(DISTINCT track) AS tracks
   FROM teaches GROUP BY concept`,
);
const qTeachingLevels = db.prepare(
  `SELECT te.track, te.level, te.weight,
          l.name AS level_name, l.subtitle AS level_subtitle,
          t.name AS track_name, t.color_hex, t.grad_from, t.grad_to,
          (SELECT path FROM lesson WHERE track = te.track AND level = te.level ORDER BY sort LIMIT 1) AS first
   FROM teaches te
   JOIN level l ON l.track = te.track AND l.idx = te.level
   JOIN track t ON t.id = te.track
   WHERE te.concept = ?
   ORDER BY t.sort, te.level`,
);
const qConceptsTaughtBy = db.prepare(
  `SELECT te.concept, t.name FROM teaches te JOIN track t ON t.id = te.concept
   WHERE te.track = ? AND te.level = ? ORDER BY te.weight DESC, t.sort`,
);
const qAllTeaches = db.prepare('SELECT concept, track, level, weight FROM teaches ORDER BY concept, track, level');
const qAllUnlocks = db.prepare('SELECT source, target FROM unlocks ORDER BY source, target');
const qCheatsheet = db.prepare('SELECT meta, description, placeholder FROM cheatsheet WHERE track = ?');
const qCheatsheetTracks = db.prepare('SELECT track FROM cheatsheet ORDER BY track');
const qCheatsheetCats = db.prepare('SELECT sort, name, icon FROM cheatsheet_category WHERE track = ? ORDER BY sort');
const qCheatsheetItems = db.prepare(
  'SELECT category, keys, action FROM cheatsheet_item WHERE track = ? ORDER BY category, sort',
);

type Row = Record<string, string | number | null>;

export function getLevels(trackId: string): Level[] {
  const rows = qLevels.all(trackId) as Row[];
  if (!rows.length) throw new Error(`Track "${trackId}" has no syllabus`);

  const tags = new Map<number, string[]>();
  for (const t of qTags.all(trackId) as { idx: number; tag: string }[]) {
    const list = tags.get(t.idx) ?? [];
    list.push(t.tag);
    tags.set(t.idx, list);
  }

  return rows.map((n, i) => ({
    idx: Number(n.idx),
    name: String(n.name),
    subtitle: String(n.subtitle),
    description: String(n.description),
    tags: tags.get(Number(n.idx)) ?? [],
    color: (n.color as string | null) ?? PALETTE[i % PALETTE.length],
    colorHex: (n.color_hex as string | null) ?? PALETTE_HEX[i % PALETTE_HEX.length],
    digit: (n.digit as string | null) ?? String(n.idx),
  }));
}

export function levelOf(trackId: string, idx: number): Level {
  const levels = getLevels(trackId);
  return levels.find((l) => l.idx === idx) ?? levels[0];
}

function toTrack(r: Row): Track {
  const id = String(r.id);
  return {
    id,
    name: String(r.name),
    subtitle: String(r.subtitle),
    description: String(r.description),
    colorHex: String(r.color_hex),
    gradFrom: String(r.grad_from),
    gradTo: String(r.grad_to),
    status: String(r.status) as Status,
    sort: Number(r.sort),
    category: String(r.category),
    ref: {
      config: (r.ref_config as string | null) ?? undefined,
      resources: (r.ref_resources as string | null) ?? undefined,
    },
    features: qFeatures.all(id) as Track['features'],
    chips: qChips.all(id) as Track['chips'],
  };
}

export function getTracks(): Track[] {
  return (qTracks.all() as Row[]).map(toTrack);
}

export function getTrack(id: string): Track {
  const r = qTrack.get(id) as Row | undefined;
  if (!r) throw new Error(`No such track "${id}"`);
  return toTrack(r);
}

export interface CategoryWithTracks {
  category: Category;
  written: Track[];
  pending: Track[];
  lessons: number;
  minutes: number;
}

export function getCategories(): Category[] {
  return (qCategories.all() as Row[]).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    description: String(c.description),
    colorHex: String(c.color_hex),
    gradFrom: String(c.grad_from),
    gradTo: String(c.grad_to),
    stratum: String(c.stratum) as Stratum,
    sort: Number(c.sort),
  }));
}

export function getMap(): Record<Stratum, CategoryWithTracks[]> {
  const categories = getCategories();
  const tracks = getTracks();

  const build = (category: Category): CategoryWithTracks => {
    const own = tracks.filter((t) => t.category === category.id);
    const s = qStats.get(category.id) as { lessons: number; minutes: number };
    return {
      category,
      written: own.filter((t) => t.status === 'written'),
      pending: own.filter((t) => t.status !== 'written'),
      lessons: Number(s.lessons),
      minutes: Number(s.minutes),
    };
  };

  const byStratum = (s: Stratum) => categories.filter((c) => c.stratum === s).map(build);

  return {
    concept: byStratum('concept'),
    implementation: byStratum('implementation'),
    tool: byStratum('tool'),
  };
}

export interface StratumInfo {
  id: Stratum;
  name: string;
  sort: number;
}

export function getStrata(): StratumInfo[] {
  return (qStrata.all() as Row[]).map((s) => ({
    id: String(s.id) as Stratum,
    name: String(s.name),
    sort: Number(s.sort),
  }));
}

export function getTotals(): { lessons: number; minutes: number; tracks: number } {
  const t = qTotals.get() as { lessons: number; minutes: number; tracks: number };
  return { lessons: Number(t.lessons), minutes: Number(t.minutes), tracks: Number(t.tracks) };
}

export function minutesOf(duration?: string): number {
  const m = /(\d+)/.exec(duration ?? '');
  return m ? Number(m[1]) : 0;
}

export function hoursOf(trackId: string): number {
  return Math.round(lessonsOf(trackId).reduce((a, l) => a + l.minutes, 0) / 60);
}

export function lessonsOf(trackId: string): Lesson[] {
  return (qLessons.all(trackId) as Row[]).map((l) => ({
    id: String(l.path),
    track: String(l.track),
    level: Number(l.level),
    sort: Number(l.sort),
    position: String(l.position),
    title: String(l.title),
    description: String(l.description),
    minutes: Number(l.minutes),
  }));
}

export interface Concept extends Track {
  edges: number;
  tracksTeaching: number;
}

// The 30 concepts are the `indexed` tracks: no lessons of their own, but
// teaches-edges into the levels that already teach them (docs/ontology.md §6).
export function getConcepts(): Concept[] {
  const counts = new Map((qConceptCounts.all() as Row[]).map((r) => [String(r.concept), r]));
  return getTracks()
    .filter((t) => t.status === 'indexed')
    .map((t) => {
      const c = counts.get(t.id);
      return { ...t, edges: Number(c?.edges ?? 0), tracksTeaching: Number(c?.tracks ?? 0) };
    });
}

// Declared but not yet indexed: visible as explicit gaps, no page of their own.
export function getPlannedConcepts(): Concept[] {
  return getTracks()
    .filter((t) => t.status === 'planned')
    .map((t) => ({ ...t, edges: 0, tracksTeaching: 0 }));
}

export interface TeachingLevel {
  track: string;
  trackName: string;
  level: number;
  weight: number;
  levelName: string;
  levelSubtitle: string;
  colorHex: string;
  gradFrom: string;
  gradTo: string;
  firstLesson?: string;
}

export function teachingLevels(conceptId: string): TeachingLevel[] {
  return (qTeachingLevels.all(conceptId) as Row[]).map((r) => ({
    track: String(r.track),
    trackName: String(r.track_name),
    level: Number(r.level),
    weight: Number(r.weight),
    levelName: String(r.level_name),
    levelSubtitle: String(r.level_subtitle),
    colorHex: String(r.color_hex),
    gradFrom: String(r.grad_from),
    gradTo: String(r.grad_to),
    firstLesson: (r.first as string | null) ?? undefined,
  }));
}

export function conceptsTaughtBy(trackId: string, level: number): { id: string; name: string }[] {
  return (qConceptsTaughtBy.all(trackId, level) as Row[]).map((r) => ({
    id: String(r.concept),
    name: String(r.name),
  }));
}

export function getTeaches(): [string, string, number, number][] {
  return (qAllTeaches.all() as Row[]).map((r) => [
    String(r.concept),
    String(r.track),
    Number(r.level),
    Number(r.weight),
  ]);
}

export function getUnlocks(): [string, string][] {
  return (qAllUnlocks.all() as Row[]).map((r) => [String(r.source), String(r.target)]);
}

export interface CheatsheetItem {
  keys: string;
  action: string;
}

export interface Cheatsheet {
  meta: string;
  description: string;
  placeholder: string;
  cats: { name: string; icon: string; items: CheatsheetItem[] }[];
}

export function cheatsheetTracks(): string[] {
  return (qCheatsheetTracks.all() as Row[]).map((r) => String(r.track));
}

export function hasCheatsheet(trackId: string): boolean {
  return qCheatsheet.get(trackId) !== undefined;
}

export function getCheatsheet(trackId: string): Cheatsheet {
  const head = qCheatsheet.get(trackId) as Row | undefined;
  if (!head) throw new Error(`Track "${trackId}" has no cheatsheet`);

  const items = new Map<number, CheatsheetItem[]>();
  for (const it of qCheatsheetItems.all(trackId) as Row[]) {
    const list = items.get(Number(it.category)) ?? [];
    list.push({ keys: String(it.keys), action: String(it.action) });
    items.set(Number(it.category), list);
  }

  return {
    meta: String(head.meta),
    description: String(head.description),
    placeholder: String(head.placeholder),
    cats: (qCheatsheetCats.all(trackId) as Row[]).map((c) => ({
      name: String(c.name),
      icon: String(c.icon),
      items: items.get(Number(c.sort)) ?? [],
    })),
  };
}
