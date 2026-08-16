// The contract every runtime honours: JS today, Lua and SQL next. Events are
// plain JSON because they cross a worker boundary.

export interface Test {
  /** A JS expression evaluated after the code runs: `sort([3,1,2])`. */
  call: string;
  /** Expected value, as an expression: `[1,2,3]`. Compared structurally. */
  expect: string;
  /** Shown instead of the expression when the reader should not see the answer. */
  label?: string;
}

export interface TestResult {
  call: string;
  label?: string;
  pass: boolean;
  got?: string;
  want?: string;
  error?: string;
}

export type RunEvent =
  | { k: 'out'; text: string }
  | { k: 'err'; text: string }
  | { k: 'tests'; results: TestResult[] }
  /** Emitted by trace.* calls; the structure viewer draws these. */
  | { k: 'trace'; step: unknown }
  | { k: 'done'; ms: number };

export interface Runtime {
  run(code: string, tests?: Test[]): AsyncIterable<RunEvent>;
  /** Kills whatever is running, including an infinite loop. */
  stop(): void;
  destroy(): void;
}
