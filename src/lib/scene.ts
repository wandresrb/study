export interface Scene {
  advance(p: number): void;
  start?(): void;
  reset?(): void;
  destroy(): void;
}

export type Mount = (host: HTMLElement) => Scene | Promise<Scene>;

// Single source for the engine's phase split and the page's keyboard jumps.
// Duplicating it desynced them twice; import it, never copy the number.
export const END = 0.72;
