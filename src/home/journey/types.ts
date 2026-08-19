/** The seven layers of the machine. Names travel as stack frames; do not translate. */
export type LayerId = 'HARDWARE' | 'FIRMWARE' | 'KERNEL' | 'SYSCALL' | 'USERSPACE' | 'RED' | 'APP';

export interface Layer {
id: LayerId;
  /** What the chapter is called in the chrome. */
  title: string;
}

/** Accent roles a figure can paint with; resolved to theme tokens by the figures. */
export type Tone = 'ink' | 'muted' | 'mauve' | 'blue' | 'green' | 'peach' | 'red' | 'teal';

/* ── figure specs ─────────────────────────────────────────────────────────── */

export interface FlowNode {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: Tone;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

/** A labelled backdrop region — the privilege rings, the machine boundary. */
export interface FlowBand {
  label: string;
  y: number;
  h: number;
  tone?: Tone;
}

export interface FlowFigure {
  kind: 'flow';
  nodes: FlowNode[];
  edges: FlowEdge[];
  bands?: FlowBand[];
  /** Node ids the traveller visits, in order. */
  travel?: string[];
  travelLabel?: string;
}

export interface TreeNode {
  label: string;
  sub?: string;
  tone?: Tone;
  children?: TreeNode[];
}

export interface TreeFigure {
  kind: 'tree';
  root: TreeNode;
  caption?: string;
}

export interface BarSegment {
  label?: string;
  /** Share of the row, 0–1. */
  w: number;
  tone?: Tone;
  /** Painted as an outline instead of a fill — free space, unmapped pages. */
  hollow?: boolean;
}

export interface BarRow {
  label: string;
  note?: string;
  segments: BarSegment[];
}

export interface BarsFigure {
  kind: 'bars';
  rows: BarRow[];
  /** Optional scale caption under the rows. */
  scale?: string;
}

export interface CycleStep {
  label: string;
  sub?: string;
  tone?: Tone;
}

export interface CycleFigure {
  kind: 'cycle';
  steps: CycleStep[];
  center: string;
  centerSub?: string;
}

export interface MorphStage {
  label: string;
  /** Lines of monospaced text; `>` prefixes an accented line. */
  lines: string[];
  tone?: Tone;
}

export interface MorphFigure {
  kind: 'morph';
  stages: MorphStage[];
}

export interface LogLine {
  text: string;
  tone?: Tone;
  /** Milliseconds after the previous line. */
  gap?: number;
  /** Resolves from noise — the firmware and bootloader beats. */
  scramble?: boolean;
  /** Lights this xray item when the line lands. */
  lights?: string;
}

export interface XrayItem {
  id: string;
  label: string;
  /** Cells to light one by one, or a single bar to fill. */
  cells?: number;
  bar?: boolean;
  tone?: Tone;
}

export interface LogFigure {
  kind: 'log';
  title: string;
  lines: LogLine[];
  xray?: XrayItem[];
}

/** The hierarchy laid out as it physically is, with a datum walking it. */
export interface HierarchyFigure {
  kind: 'hierarchy';
}

/** One real instruction walking the fetch-decode-execute path. */
export interface DatapathFigure {
  kind: 'datapath';
}

/** Clock and buses, with the lens shape that changes value on the edge. */
export interface TimingFigure {
  kind: 'timing';
}

export interface BoardFigure {
  kind: 'board';
  /** Where the camera rests for this beat, in engine progress (0–1). */
  mark: number;
  /** How exploded the machine is at this beat: 1 apart, 0 assembled. */
  explode: number;
  /** Labels pinned to the scene, in percentages of the stage. */
  pins?: { label: string; x: number; y: number; from?: 'left' | 'right' }[];
  /** The instrument docked beside the machine for this beat. */
  panel?: 'probe' | 'gate';
}

export interface RevealFigure {
  kind: 'reveal';
}

export interface GraphFigure {
  kind: 'graph';
}

export type Figure =
  | BoardFigure
  | FlowFigure
  | TreeFigure
  | BarsFigure
  | CycleFigure
  | MorphFigure
  | LogFigure
  | DatapathFigure
  | HierarchyFigure
  | TimingFigure
  | RevealFigure
  | GraphFigure;

/* ── beats ────────────────────────────────────────────────────────────────── */

export interface Beat {
  id: string;
  layer: LayerId;
  /** First beat of its layer: pushes the frame onto the stack. */
  pushes?: boolean;
  kicker: string;
  title: string;
  lede: string;
  /** Track ids to study this layer. */
  chips?: string[];
  /** Bottom-left line: what the reader can do here. */
  hint?: string;
  figure: Figure;
}
