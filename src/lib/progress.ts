// Reading progress, the site's second piece of user state (after ReaderPrefs).
// IndexedDB 'progress' / store 'read' (lesson id → { at }); tabs hear about
// changes through BroadcastChannel and re-read the store — the channel carries
// the signal, never the data. Writes are single-key and idempotent, so
// IndexedDB transactions are enough: no Web Locks, no leader — two tabs
// marking the same lesson converge on their own. Everything degrades to a
// no-op when storage is unavailable: progress is an enhancement, never a
// requirement.

const DB = 'progress';
const STORE = 'read';

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
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function ensureChannel(): void {
  if (!channel && 'BroadcastChannel' in globalThis) {
    channel = new BroadcastChannel('progress');
    channel.onmessage = () => listeners.forEach((fn) => fn());
  }
}

function notify(): void {
  ensureChannel();
  channel?.postMessage(1); // the sender does not hear its own channel
  listeners.forEach((fn) => fn());
}

export function onProgressChange(fn: Listener): void {
  ensureChannel();
  listeners.add(fn);
}

export async function readSet(): Promise<Set<string>> {
  try {
    const db = await open();
    const keys = await request(db.transaction(STORE).objectStore(STORE).getAllKeys());
    return new Set(keys as string[]);
  } catch {
    return new Set();
  }
}

export async function isRead(id: string): Promise<boolean> {
  try {
    const db = await open();
    return (await request(db.transaction(STORE).objectStore(STORE).getKey(id))) !== undefined;
  } catch {
    return false;
  }
}

async function write(apply: (store: IDBObjectStore) => void): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite', { durability: 'relaxed' });
  apply(tx.objectStore(STORE));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  notify();
}

export async function markRead(id: string): Promise<void> {
  try {
    await write((s) => s.put({ at: Date.now() }, id));
  } catch {
    /* storage denied: stay a no-op */
  }
}

export async function unmarkRead(id: string): Promise<void> {
  try {
    await write((s) => s.delete(id));
  } catch {
    /* storage denied: stay a no-op */
  }
}

export async function toggleRead(id: string): Promise<boolean> {
  const read = await isRead(id);
  if (read) await unmarkRead(id);
  else await markRead(id);
  return !read;
}

// '/guide/rust/n39-generar-bindings/' → 'rust/n39-generar-bindings'
export const lessonIdOf = (href: string): string =>
  new URL(href, 'https://x').pathname.replace('/guide/', '').replace(/\/$/, '');
