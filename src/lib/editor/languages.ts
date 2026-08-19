// Every language the site can highlight, loaded on demand: a lesson that shows
// Rust must not ship the C++ grammar. Swift and Lua have no official CodeMirror
// package, so they come from the CodeMirror 5 modes through StreamLanguage —
// coarser highlighting, but real.
import type { Extension } from '@codemirror/state';

export type Language =
  | 'text'
  | 'js'
  | 'ts'
  | 'jsx'
  | 'tsx'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'python'
  | 'sql'
  | 'swift'
  | 'lua'
  | 'kotlin'
  | 'css'
  | 'html'
  | 'markdown';

const stream = async (mode: string, name: string): Promise<Extension> => {
  const [{ StreamLanguage }, mod] = await Promise.all([
    import('@codemirror/language'),
    import(`@codemirror/legacy-modes/mode/${mode}`),
  ]);
  return StreamLanguage.define((mod as Record<string, never>)[name]);
};

const LOADERS: Record<Exclude<Language, 'text'>, () => Promise<Extension>> = {
  js: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
  ts: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true })),
  jsx: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  tsx: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true })),
  rust: () => import('@codemirror/lang-rust').then((m) => m.rust()),
  c: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  cpp: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  sql: () => import('@codemirror/lang-sql').then((m) => m.sql()),
  css: () => import('@codemirror/lang-css').then((m) => m.css()),
  html: () => import('@codemirror/lang-html').then((m) => m.html()),
  markdown: () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  swift: () => stream('swift', 'swift'),
  lua: () => stream('lua', 'lua'),
  kotlin: () => stream('clike', 'kotlin'),
};

export const LANGUAGES = Object.keys(LOADERS) as Exclude<Language, 'text'>[];

/** Plain text and anything unknown resolve to no grammar, never to a throw. */
export async function languageOf(name: Language = 'text'): Promise<Extension> {
  const load = LOADERS[name as Exclude<Language, 'text'>];
  if (!load) return [];
  try {
    return await load();
  } catch {
    return [];
  }
}
