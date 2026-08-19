export interface Scene {
  /** Where along the hardware sequence the camera is, 0 to 1. */
  advance(p: number): void;
  start?(): void;
  reset?(): void;
  /** 1 pulls the machine apart along its layers, 0 assembles it. */
  explode?(v: number): void;
  /** The probed lane: `t` is the page's clock, in seconds. */
  probe?(t: number, lit: number): void;
  /** Lifts the lid off the package, 0 shut to 1 open. */
  open?(v: number): void;
  /** The magnified pair: each gate's input, and how lit the detail is. */
  gate?(t: number, a: number, b: number, lit: number): void;
  destroy(): void;
}

export type Mount = (host: HTMLElement) => Scene | Promise<Scene>;
