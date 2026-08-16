// Runs the reader's JavaScript. A worker and not an iframe: terminate() kills an
// infinite loop without touching the document, and postMessage already carries
// structured data. Nothing here can reach the page.

interface Incoming {
  code: string;
  tests?: { call: string; expect: string; label?: string }[];
}

const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);

const show = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

const line = (args: unknown[]) => args.map(show).join(' ');

self.console = {
  ...self.console,
  log: (...a: unknown[]) => post({ k: 'out', text: line(a) }),
  info: (...a: unknown[]) => post({ k: 'out', text: line(a) }),
  warn: (...a: unknown[]) => post({ k: 'err', text: line(a) }),
  error: (...a: unknown[]) => post({ k: 'err', text: line(a) }),
} as Console;

// The explicit trace API. Deducing structures from arbitrary code is a project
// of its own; a lesson that wants a drawing says so.
const trace = new Proxy(
  {},
  {
    get:
      (_t, op: string) =>
      (...args: unknown[]) =>
        post({ k: 'trace', step: { op, args } }),
  },
);
(self as unknown as Record<string, unknown>).trace = trace;

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

self.onmessage = async (e: MessageEvent<Incoming>) => {
  const { code, tests = [] } = e.data;
  const started = Date.now();
  try {
    // The tests run in the same scope as the code, so they see its declarations.
    const body = `${code}\n;return [${tests.map((t) => `(async()=>(${t.call}))()`).join(',')}];`;
    const got = await Promise.all(await new AsyncFunction('trace', body)(trace));

    if (tests.length) {
      const wants = await new AsyncFunction(`return [${tests.map((t) => t.expect).join(',')}];`)();
      post({
        k: 'tests',
        results: tests.map((t, i) => {
          const a = show(got[i]);
          const b = show(wants[i]);
          return { call: t.call, label: t.label, pass: a === b, got: a, want: b };
        }),
      });
    }
  } catch (err) {
    post({ k: 'err', text: show(err) });
    if (tests.length) {
      post({
        k: 'tests',
        results: tests.map((t) => ({ call: t.call, label: t.label, pass: false, error: show(err) })),
      });
    }
  }
  post({ k: 'done', ms: Date.now() - started });
};
