/** Everything the reader has done, in one shape. */
export type Kind = 'lesson' | 'exercise';

/** 0 = done · 1 = without a hint · 2 = within budget */
export type Mastery = 0 | 1 | 2;

export interface Item {
  /** 'rust/n39-bindings' for a lesson, 'neovim/gramatica-vim#d-1a2b' for an exercise */
  id: string;
  kind: Kind;
  /** the lesson it belongs to; for a lesson, itself */
  lesson: string;
  mastery: Mastery;
  attempts: number;
  misses: number;
  /** rung of REVIEW_DAYS, and the day (epoch days) it comes back */
  step: number;
  dueOn: number;
  /** last touched, epoch ms */
  at: number;
  /** what to show when it is replayed away from its lesson */
  label?: string;
  /** whatever the replay needs: a drill definition, an exercise's code */
  data?: unknown;
}

export interface Stats {
  total: number;
  mastered: number;
  attempts: number;
  misses: number;
  weakest: Item[];
}
