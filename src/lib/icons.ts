import type { AstroComponent } from '@lucide/astro';

import Activity from '@lucide/astro/icons/activity';
import ArrowRightLeft from '@lucide/astro/icons/arrow-right-left';
import Atom from '@lucide/astro/icons/atom';
import Bird from '@lucide/astro/icons/bird';
import Boxes from '@lucide/astro/icons/boxes';
import Box from '@lucide/astro/icons/box';
import Braces from '@lucide/astro/icons/braces';
import Brain from '@lucide/astro/icons/brain';
import BrickWall from '@lucide/astro/icons/brick-wall';
import Brush from '@lucide/astro/icons/brush';
import Bug from '@lucide/astro/icons/bug';
import CircleSlash from '@lucide/astro/icons/circle-slash';
import Cloud from '@lucide/astro/icons/cloud';
import Coffee from '@lucide/astro/icons/coffee';
import Cog from '@lucide/astro/icons/cog';
import Columns3 from '@lucide/astro/icons/columns-3';
import Combine from '@lucide/astro/icons/combine';
import Cpu from '@lucide/astro/icons/cpu';
import Database from '@lucide/astro/icons/database';
import Dices from '@lucide/astro/icons/dices';
import DoorOpen from '@lucide/astro/icons/door-open';
import FileCode from '@lucide/astro/icons/file-code';
import FileCog from '@lucide/astro/icons/file-cog';
import FolderTree from '@lucide/astro/icons/folder-tree';
import Gauge from '@lucide/astro/icons/gauge';
import GitBranch from '@lucide/astro/icons/git-branch';
import GitFork from '@lucide/astro/icons/git-fork';
import Globe from '@lucide/astro/icons/globe';
import Grid3x3 from '@lucide/astro/icons/grid-3x3';
import HardDrive from '@lucide/astro/icons/hard-drive';
import KeyRound from '@lucide/astro/icons/key-round';
import Layers from '@lucide/astro/icons/layers';
import Link from '@lucide/astro/icons/link';
import ListTree from '@lucide/astro/icons/list-tree';
import MemoryStick from '@lucide/astro/icons/memory-stick';
import Milestone from '@lucide/astro/icons/milestone';
import MonitorCog from '@lucide/astro/icons/monitor-cog';
import Moon from '@lucide/astro/icons/moon';
import Network from '@lucide/astro/icons/network';
import Orbit from '@lucide/astro/icons/orbit';
import Package from '@lucide/astro/icons/package';
import Paintbrush from '@lucide/astro/icons/paintbrush';
import PlugZap from '@lucide/astro/icons/plug-zap';
import Puzzle from '@lucide/astro/icons/puzzle';
import Radio from '@lucide/astro/icons/radio';
import Repeat from '@lucide/astro/icons/repeat';
import Rocket from '@lucide/astro/icons/rocket';
import Scale from '@lucide/astro/icons/scale';
import Search from '@lucide/astro/icons/search';
import Shapes from '@lucide/astro/icons/shapes';
import Shield from '@lucide/astro/icons/shield';
import Smartphone from '@lucide/astro/icons/smartphone';
import Sparkles from '@lucide/astro/icons/sparkles';
import Split from '@lucide/astro/icons/split';
import SquareTerminal from '@lucide/astro/icons/square-terminal';
import TabletSmartphone from '@lucide/astro/icons/tablet-smartphone';
import Terminal from '@lucide/astro/icons/terminal';
import Timer from '@lucide/astro/icons/timer';
import TreeDeciduous from '@lucide/astro/icons/tree-deciduous';
import TrendingUp from '@lucide/astro/icons/trending-up';
import Waypoints from '@lucide/astro/icons/waypoints';
import Workflow from '@lucide/astro/icons/workflow';
import Zap from '@lucide/astro/icons/zap';

const TRACK_ICON: Record<string, AstroComponent> = {
  'linear-algebra': Grid3x3,
  'algoritmos': Workflow,
  'android': Smartphone,
  'animacion': Sparkles,
  'aprendizaje-automatico': Brain,
  'arquitectura-cpu': Cpu,
  'astro': Rocket,
  'bash': Terminal,
  'bases-datos': Database,
  'build': Package,
  'c23': FileCode,
  'canvas': Brush,
  'cloudflare': Cloud,
  'complejidad': TrendingUp,
  'computabilidad': CircleSlash,
  'concurrencia': Split,
  'consistencia': Scale,
  'criptografia': KeyRound,
  'css': Paintbrush,
  'devtools': Bug,
  'diseno-apis': Link,
  'dotfiles': FileCog,
  'drivers-io': PlugZap,
  'elm': TreeDeciduous,
  'estado': Activity,
  'estructuras-datos': ListTree,
  'event-driven': Radio,
  'flux': Repeat,
  'fzf-ripgrep': Search,
  'git': GitBranch,
  'http-web': Globe,
  'ios': TabletSmartphone,
  'jerarquia-memoria': MemoryStick,
  'kernel': Layers,
  'kotlin': Coffee,
  'local-first': HardDrive,
  'logic': Milestone,
  'lua': Moon,
  'maquinas': GitFork,
  'discrete-math': Waypoints,
  'memoria-virtual': MemoryStick,
  'microkernels': Puzzle,
  'microservicios': Boxes,
  'modelos-datos': Boxes,
  'monolitos': BrickWall,
  'mvi': Orbit,
  'neovim': SquareTerminal,
  'probability': Dices,
  'procesos': Timer,
  'programacion-reactiva': Zap,
  'reactividad-fina': Network,
  'rendimiento': Gauge,
  'rust': Cog,
  'seguridad-sistemas': Shield,
  'sistemas-distribuidos': Globe,
  'sistemas-ficheros': FolderTree,
  'solid': Atom,
  'swift': Bird,
  'syscalls': DoorOpen,
  'tca': Combine,
  'tcp-ip': Network,
  'teoria-lenguajes': Braces,
  'number-theory': KeyRound,
  'teoria-tipos': Shapes,
  'three': Box,
  'tmux': Columns3,
  'transacciones': ArrowRightLeft,
  'webgpu': MonitorCog,
};

export function iconOf(trackId: string): AstroComponent {
  const Icon = TRACK_ICON[trackId];
  if (!Icon) {
    throw new Error(
      `El track "${trackId}" no tiene icono. Añádelo a TRACK_ICON en src/lib/icons.ts ` +
        `con su import de @lucide/astro/icons/<nombre>.`,
    );
  }
  return Icon;
}
