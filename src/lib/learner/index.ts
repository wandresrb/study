// The reader's state, in one place: lessons read, drills practised and
// exercises solved, all as Items in one IndexedDB store. Before this there were
// two stores that did not talk to each other and keyed lessons differently.
//
// Everything degrades to a no-op when storage is unavailable: progress is an
// enhancement, never a requirement. Tabs hear about changes through a
// BroadcastChannel that carries the signal, never the data.

import type { Item, Kind, Mastery, Stats } from './types';

const DB = 'learner';
const ITEMS = 'items';
const DAYS = 'days';

/** Review intervals, in days. A miss steps back one. */
export const REVIEW_DAYS = [1, 3, 7, 21];

const today = () => Math.floor(Date.now() / 86_400_000);

type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | undefined;
let dbPromise: Promise<IDBDatabase> | undefined;

const request = <T,>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const items = db.createObjectStore(ITEMS, { keyPath: 'id' });
      items.createIndex('lesson', 'lesson');
      items.createIndex('kind', 'kind');
      items.createIndex('dueOn', 'dueOn');
      db.createObjectStore(DAYS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function ensureChannel(): void {
  if (!channel && 'BroadcastChannel' in globalThis) {
    channel = new BroadcastChannel(DB);
    channel.onmessage = () => listeners.forEach((fn) => fn());
  }
}

function notify(): void {
  ensureChannel();
  channel?.postMessage(1); // the sender does not hear its own channel
  listeners.forEach((fn) => fn());
}

export function onChange(fn: Listener): void {
  ensureChannel();
  listeners.add(fn);
}

async function tx(stores: string[], mode: IDBTransactionMode, apply: (t: IDBTransaction) => void) {
  const db = await open();
  const t = db.transaction(stores, mode, { durability: 'relaxed' });
  apply(t);
  await new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  if (mode === 'readwrite') notify();
}

async function all(): Promise<Item[]> {
  try {
    const db = await open();
    return await request(db.transaction(ITEMS).objectStore(ITEMS).getAll() as IDBRequest<Item[]>);
  } catch {
    return [];
  }
}

export async function get(id: string): Promise<Item | undefined> {
  try {
    const db = await open();
    return await request(db.transaction(ITEMS).objectStore(ITEMS).get(id) as IDBRequest<Item>);
  } catch {
    return undefined;
  }
}

/* ── lessons ─────────────────────────────────────────────────────────────── */

// '/guide/rust/n39-generar-bindings/' → 'rust/n39-generar-bindings'
export const lessonIdOf = (href: string): string =>
  new URL(href, 'https://x').pathname.replace('/guide/', '').replace(/\/$/, '');

export async function markRead(lesson: string): Promise<void> {
  try {
    const previous = await get(lesson);
    const item: Item = {
      id: lesson,
      kind: 'lesson',
      lesson,
      mastery: previous?.mastery ?? 0,
      attempts: previous?.attempts ?? 0,
      misses: previous?.misses ?? 0,
      step: previous?.step ?? 0,
      dueOn: previous?.dueOn ?? today(),
      at: Date.now(),
    };
    await tx([ITEMS], 'readwrite', (t) => t.objectStore(ITEMS).put(item));
  } catch {
    /* storage denied: stay a no-op */
  }
}

export async function unmarkRead(lesson: string): Promise<void> {
  try {
    await tx([ITEMS], 'readwrite', (t) => t.objectStore(ITEMS).delete(lesson));
  } catch {
    /* storage denied: stay a no-op */
  }
}

export async function isRead(lesson: string): Promise<boolean> {
  return (await get(lesson)) !== undefined;
}

export async function toggleRead(lesson: string): Promise<boolean> {
  const read = await isRead(lesson);
  if (read) await unmarkRead(lesson);
  else await markRead(lesson);
  return !read;
}

/** The lessons marked as read — what the sidebar ticks and the track bar need. */
export async function readSet(): Promise<Set<string>> {
  return new Set((await all()).filter((i) => i.kind === 'lesson').map((i) => i.id));
}

/* ── practice ────────────────────────────────────────────────────────────── */

export interface CompleteInput {
  kind: Exclude<Kind, 'lesson'>;
  lesson: string;
  label?: string;
  data?: unknown;
  /** solved without asking for the hint */
  noHint?: boolean;
  /** solved within the optimal keystroke budget */
  withinBudget?: boolean;
}

export async function complete(id: string, input: CompleteInput): Promise<void> {
  try {
    const previous = await get(id);
    const mastery: Mastery = input.withinBudget ? 2 : input.noHint ? 1 : 0;
    const step = previous ? Math.min(previous.step + 1, REVIEW_DAYS.length - 1) : 0;
    const item: Item = {
      id,
      kind: input.kind,
      lesson: input.lesson,
      label: input.label,
      data: input.data,
      // mastery never drops: it records the best the reader ever managed
      mastery: Math.max(previous?.mastery ?? 0, mastery) as Mastery,
      attempts: (previous?.attempts ?? 0) + 1,
      misses: previous?.misses ?? 0,
      step,
      dueOn: today() + REVIEW_DAYS[step],
      at: Date.now(),
    };
    await tx([ITEMS, DAYS], 'readwrite', (t) => {
      t.objectStore(ITEMS).put(item);
      t.objectStore(DAYS).put(1, today());
    });
  } catch {
    /* storage denied: stay a no-op */
  }
}

export async function miss(id: string): Promise<void> {
  const item = await get(id);
  if (!item) return; // only what was practised can be missed
  item.misses += 1;
  item.step = Math.max(0, item.step - 1);
  item.dueOn = today() + REVIEW_DAYS[item.step];
  item.at = Date.now();
  try {
    await tx([ITEMS], 'readwrite', (t) => t.objectStore(ITEMS).put(item));
  } catch {
    /* storage denied: stay a no-op */
  }
}

/** Due reviews, the most overdue first. Lessons are read, not reviewed. */
export async function due(): Promise<Item[]> {
  return (await all())
    .filter((i) => i.kind !== 'lesson' && i.dueOn <= today())
    .sort((a, b) => a.dueOn - b.dueOn);
}

/** done/mastered per lesson, for the sidebar ticks. */
export async function byLesson(): Promise<Map<string, { done: number; mastered: number }>> {
  const map = new Map<string, { done: number; mastered: number }>();
  for (const i of await all()) {
    if (i.kind === 'lesson') continue;
    const acc = map.get(i.lesson) ?? { done: 0, mastered: 0 };
    acc.done += 1;
    if (i.mastery >= 1) acc.mastered += 1;
    map.set(i.lesson, acc);
  }
  return map;
}

/** Consecutive days of practice ending today or yesterday. */
export async function streak(): Promise<number> {
  let days: Set<number>;
  try {
    const db = await open();
    const keys = await request(db.transaction(DAYS).objectStore(DAYS).getAllKeys());
    days = new Set(keys as number[]);
  } catch {
    return 0;
  }
  let d = days.has(today()) ? today() : today() - 1;
  let n = 0;
  while (days.has(d)) {
    n += 1;
    d -= 1;
  }
  return n;
}

export async function stats(): Promise<Stats> {
  const practised = (await all()).filter((i) => i.kind !== 'lesson');
  return {
    total: practised.length,
    mastered: practised.filter((i) => i.mastery >= 1).length,
    attempts: practised.reduce((s, i) => s + i.attempts, 0),
    misses: practised.reduce((s, i) => s + i.misses, 0),
    weakest: practised
      .filter((i) => i.misses > 0)
      .sort((a, b) => b.misses - a.misses)
      .slice(0, 8),
  };
}

/* ── portability ─────────────────────────────────────────────────────────── */

/** The only "backend" is a JSON the reader takes with them. */
export async function exportAll(): Promise<string> {
  let days: number[] = [];
  try {
    const db = await open();
    days = (await request(db.transaction(DAYS).objectStore(DAYS).getAllKeys())) as number[];
  } catch {
    /* no days is a valid export */
  }
  return JSON.stringify({ v: 1, items: await all(), days });
}

export async function importAll(json: string): Promise<void> {
  const parsed = JSON.parse(json) as { items?: Item[]; days?: number[] };
  const items = parsed.items ?? [];
  const days = parsed.days ?? [];
  await tx([ITEMS, DAYS], 'readwrite', (t) => {
    const store = t.objectStore(ITEMS);
    store.clear();
    for (const i of items) store.put(i);
    const dayStore = t.objectStore(DAYS);
    dayStore.clear();
    for (const d of days) dayStore.put(1, d);
  });
}
