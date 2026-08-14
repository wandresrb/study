export interface Escena {
  avance(p: number): void;
  arrancar?(): void;
  reiniciar?(): void;
  destruir(): void;
}

export type Montar = (host: HTMLElement) => Escena | Promise<Escena>;

export const FIN = 0.72;
