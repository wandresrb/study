import type { AstroComponent } from '@lucide/astro';

import Activity from '@lucide/astro/icons/activity';
import ArrowRightLeft from '@lucide/astro/icons/arrow-right-left';
import Boxes from '@lucide/astro/icons/boxes';
import Braces from '@lucide/astro/icons/braces';
import Brain from '@lucide/astro/icons/brain';
import BrickWall from '@lucide/astro/icons/brick-wall';
import Brush from '@lucide/astro/icons/brush';
import Bug from '@lucide/astro/icons/bug';
import CircleSlash from '@lucide/astro/icons/circle-slash';
import Combine from '@lucide/astro/icons/combine';
import Cpu from '@lucide/astro/icons/cpu';
import Database from '@lucide/astro/icons/database';
import Dices from '@lucide/astro/icons/dices';
import DoorOpen from '@lucide/astro/icons/door-open';
import FileCode from '@lucide/astro/icons/file-code';
import FileCog from '@lucide/astro/icons/file-cog';
import FolderTree from '@lucide/astro/icons/folder-tree';
import Gauge from '@lucide/astro/icons/gauge';
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
import Network from '@lucide/astro/icons/network';
import Orbit from '@lucide/astro/icons/orbit';
import Package from '@lucide/astro/icons/package';
import PlugZap from '@lucide/astro/icons/plug-zap';
import Puzzle from '@lucide/astro/icons/puzzle';
import Radio from '@lucide/astro/icons/radio';
import Repeat from '@lucide/astro/icons/repeat';
import Scale from '@lucide/astro/icons/scale';
import Search from '@lucide/astro/icons/search';
import Shapes from '@lucide/astro/icons/shapes';
import Shield from '@lucide/astro/icons/shield';
import Sparkles from '@lucide/astro/icons/sparkles';
import Split from '@lucide/astro/icons/split';
import Timer from '@lucide/astro/icons/timer';
import TrendingUp from '@lucide/astro/icons/trending-up';
import Waypoints from '@lucide/astro/icons/waypoints';
import Workflow from '@lucide/astro/icons/workflow';
import Zap from '@lucide/astro/icons/zap';

// Brand marks for the tracks that *are* a product. Astro 7 imports an .svg as a
// component, so these come in one by one like the Lucide ones — no barrel, no
// glob. They are filled paths with no `stroke`, which is how `@utility chip`
// tells them apart. Everything else keeps a Lucide glyph: a brand logo for a
// concept ("Algoritmos", "Concurrencia") would be a lie.
import AndroidMark from 'simple-icons/icons/android.svg';
import AppleMark from 'simple-icons/icons/apple.svg';
import AstroMark from 'simple-icons/icons/astro.svg';
import BashMark from 'simple-icons/icons/gnubash.svg';
import CloudflareMark from 'simple-icons/icons/cloudflare.svg';
import CssMark from 'simple-icons/icons/css.svg';
import ElmMark from 'simple-icons/icons/elm.svg';
import GitMark from 'simple-icons/icons/git.svg';
import KotlinMark from 'simple-icons/icons/kotlin.svg';
import LuaMark from 'simple-icons/icons/lua.svg';
import NeovimMark from 'simple-icons/icons/neovim.svg';
import RustMark from 'simple-icons/icons/rust.svg';
import SolidMark from 'simple-icons/icons/solid.svg';
import SwiftMark from 'simple-icons/icons/swift.svg';
import ThreeMark from 'simple-icons/icons/threedotjs.svg';
import TmuxMark from 'simple-icons/icons/tmux.svg';
import WebgpuMark from 'simple-icons/icons/webgpu.svg';

const TRACK_ICON: Record<string, AstroComponent> = {
  'linear-algebra': Grid3x3,
  'algoritmos': Workflow,
  'android': AndroidMark,
  'animacion': Sparkles,
  'aprendizaje-automatico': Brain,
  'arquitectura-cpu': Cpu,
  'astro': AstroMark,
  'bash': BashMark,
  'bases-datos': Database,
  'build': Package,
  'c23': FileCode,
  'canvas': Brush,
  'cloudflare': CloudflareMark,
  'complejidad': TrendingUp,
  'computabilidad': CircleSlash,
  'concurrencia': Split,
  'consistencia': Scale,
  'criptografia': KeyRound,
  'css': CssMark,
  'devtools': Bug,
  'diseno-apis': Link,
  'dotfiles': FileCog,
  'drivers-io': PlugZap,
  'elm': ElmMark,
  'estado': Activity,
  'estructuras-datos': ListTree,
  'event-driven': Radio,
  'flux': Repeat,
  'fzf-ripgrep': Search,
  'git': GitMark,
  'http-web': Globe,
  'ios': AppleMark,
  'jerarquia-memoria': MemoryStick,
  'kernel': Layers,
  'kotlin': KotlinMark,
  'local-first': HardDrive,
  'logic': Milestone,
  'lua': LuaMark,
  'maquinas': GitFork,
  'discrete-math': Waypoints,
  'memoria-virtual': MemoryStick,
  'microkernels': Puzzle,
  'microservicios': Boxes,
  'modelos-datos': Boxes,
  'monolitos': BrickWall,
  'mvi': Orbit,
  'neovim': NeovimMark,
  'probability': Dices,
  'procesos': Timer,
  'programacion-reactiva': Zap,
  'reactividad-fina': Network,
  'rendimiento': Gauge,
  'rust': RustMark,
  'seguridad-sistemas': Shield,
  'sistemas-distribuidos': Globe,
  'sistemas-ficheros': FolderTree,
  'solid': SolidMark,
  'swift': SwiftMark,
  'syscalls': DoorOpen,
  'tca': Combine,
  'tcp-ip': Network,
  'teoria-lenguajes': Braces,
  'number-theory': KeyRound,
  'teoria-tipos': Shapes,
  'three': ThreeMark,
  'tmux': TmuxMark,
  'transacciones': ArrowRightLeft,
  'webgpu': WebgpuMark,
};

export function iconOf(trackId: string): AstroComponent {
  const Icon = TRACK_ICON[trackId];
  if (!Icon) {
    throw new Error(
      `Track "${trackId}" has no icon. Add it to TRACK_ICON in src/lib/icons.ts, ` +
        `importing either @lucide/astro/icons/<name> or simple-icons/icons/<name>.svg.`,
    );
  }
  return Icon;
}
