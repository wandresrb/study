import { existsSync, readdirSync, writeFileSync } from 'node:fs';

// Regenerates src/lib/card-icons.ts. The lessons pass a decorative emoji to
// <Card icon="…"> — 10.723 calls across 2.927 .mdx files — so the mapping lives
// here instead of in the content: adding an entry re-skins every lesson at once.
//
//   node scripts/build-card-icons.mjs
//
// Names are checked against what is installed, because a typo would only show up
// as a broken build. Anything unmapped keeps rendering its emoji.

const LUCIDE_DIR = 'node_modules/@lucide/astro/src/icons';
const BRAND_DIR = 'node_modules/simple-icons/icons';
const OUT = 'src/lib/card-icons.ts';

const CONCEPTS = {
  '🧩': 'puzzle', '📦': 'package', '🎯': 'target', '🧭': 'compass', '🔁': 'repeat',
  '🔗': 'link', '⚡': 'zap', '🔒': 'lock', '🧱': 'brick-wall', '🚫': 'ban',
  '🧪': 'flask-conical', '🏷️': 'tag', '🧬': 'dna', '⏱️': 'timer', '⚙️': 'cog',
  '🧵': 'spool', '🔌': 'plug', '🧮': 'calculator', '🔀': 'shuffle', '🌐': 'globe',
  '🚪': 'door-open', '⚖️': 'scale', '📐': 'ruler', '🧾': 'receipt', '⏳': 'hourglass',
  '✅': 'check', '🧠': 'brain', '📡': 'satellite-dish', '🧊': 'box', '✂️': 'scissors',
  '🔍': 'search', '🛡️': 'shield', '🌳': 'tree-deciduous', '🔢': 'hash', '✍️': 'pen-line',
  '🧹': 'brush', '🔑': 'key-round', '📏': 'ruler', '⚠️': 'triangle-alert', '🗄️': 'archive',
  '🗂️': 'folders', '📄': 'file-text', '🔬': 'microscope', '🚀': 'rocket', '🎨': 'palette',
  '🌍': 'earth', '🏗️': 'construction', '🔐': 'lock-keyhole', '♻️': 'recycle',
  '🕳️': 'circle-slash', '🪶': 'feather', '💾': 'save', '🔎': 'zoom-in', '🔱': 'git-fork',
  '🔄': 'refresh-cw', '📊': 'chart-column', '🌊': 'waves-horizontal', '📜': 'scroll-text',
  '🚦': 'gauge', '📤': 'upload', '📚': 'library', '🚧': 'construction', '🖥️': 'monitor',
  '🎛️': 'sliders-horizontal', '🎚️': 'sliders-vertical', '📥': 'download', '🕸️': 'network',
  '📝': 'notebook-pen', '🗺️': 'map', '🎭': 'drama', '📍': 'map-pin', '🌱': 'sprout',
  '🔧': 'wrench', '🍊': 'citrus', '🖼️': 'image', '💥': 'bomb', '🤝': 'handshake',
  '👁️': 'eye', '🔤': 'type', '📉': 'trending-down', '🏛️': 'landmark', '↩️': 'undo-2',
  '⚛️': 'atom', '🗃️': 'file-archive', '🕰️': 'clock', '🪞': 'flip-horizontal-2',
  '📖': 'book-open', '📮': 'mailbox', '🪜': 'list-tree', '📈': 'trending-up', '🎲': 'dices',
  '📋': 'clipboard-list', '🎬': 'clapperboard', '🪟': 'app-window', '🛠️': 'hammer',
  '⬆️': 'arrow-up', '🚨': 'siren', '📱': 'smartphone', '🔥': 'flame', '🔔': 'bell',
  '🧰': 'briefcase', '🌀': 'tornado', '➡️': 'arrow-right', '⌨️': 'keyboard', '🟢': 'circle',
  '🗑️': 'trash-2', '🌙': 'moon', '📌': 'pin', '⬇️': 'arrow-down', '🎁': 'gift',
  '🌿': 'leaf', '🧯': 'fire-extinguisher', '⛓️': 'link-2', '👻': 'ghost', '🛰️': 'satellite',
  '🔭': 'telescope', '🧨': 'bomb', '🏁': 'flag', '🟣': 'circle',

  '➕': 'plus', '🐢': 'turtle', '🛑': 'octagon-alert', '🧷': 'paperclip', '📨': 'mail',
  '🪦': 'skull', '🪪': 'id-card', '🏠': 'house', '📣': 'megaphone', '📬': 'mailbox',
  '👥': 'users', '✏️': 'pencil', '🔮': 'sparkles', '🤖': 'bot', '🔓': 'lock-open',
  '👤': 'user', '🔋': 'battery', '🪢': 'spline', '1️⃣': 'list-ordered', '🏭': 'factory',
  '🩹': 'bandage', '🔵': 'circle', '✨': 'sparkles', '✉️': 'mail', '⏰': 'alarm-clock',
  '🗝️': 'key', '🌲': 'trees', '📸': 'camera', '🎞️': 'film', '🌫️': 'cloud-fog',
  '📞': 'phone', '☁️': 'cloud', '💤': 'moon', '🗣️': 'message-circle', '⛔': 'ban',
  '📁': 'folder', '👀': 'eye', '👆': 'hand', '🐌': 'snail', '🔷': 'diamond',
  '🪆': 'layers', '🕵️': 'search', '😴': 'moon', '🩺': 'stethoscope', '💸': 'banknote',
  '🔇': 'volume-x', '💀': 'skull', '🚩': 'flag', '♾️': 'infinity', '🍇': 'grape',
  '❓': 'circle-question-mark', '🗓️': 'calendar-days', '🙈': 'eye-off', '👯': 'users',
  '🏢': 'building-2', '🚚': 'truck', '🏝️': 'tree-palm', '🛟': 'life-buoy',
  '↔️': 'arrow-left-right', '🆔': 'id-card', '📅': 'calendar', '🐞': 'bug', '🍃': 'leaf',
  '🪝': 'webhook', '🪄': 'wand-sparkles', '🔴': 'circle', '📎': 'paperclip', '🎫': 'ticket',
  '🪣': 'paint-bucket', '💬': 'message-square', '💳': 'credit-card', '🍪': 'cookie',
  '💧': 'droplet', '▶️': 'play', '📶': 'signal', '🔘': 'circle-dot', '🧼': 'droplets',
  '⚰️': 'archive', '💉': 'syringe', '💣': 'bomb', '🆕': 'badge-plus', '🧲': 'magnet',
  '🎟️': 'ticket', '🌉': 'route', '🔖': 'bookmark', '📷': 'camera', '♿': 'accessibility',
  '🔻': 'triangle', '🍋': 'citrus', '⏪': 'rewind', '3️⃣': 'list-ordered', '🔶': 'diamond',
  '📰': 'newspaper', '👂': 'ear', '🟡': 'circle', '🗜️': 'combine', '🏎️': 'car',
  '🎒': 'backpack', '⏸️': 'pause', '📇': 'contact', '🎼': 'music', '🍒': 'cherry',
  '⏭️': 'skip-forward', '🎧': 'headphones', '✋': 'hand', '👑': 'crown', '✖️': 'x',
  '2️⃣': 'list-ordered', '🔩': 'bolt', '🖱️': 'mouse', '▲': 'triangle', '🪤': 'triangle-alert',
  '⭕': 'circle', '🏃': 'footprints', '🔨': 'hammer', '🐛': 'bug', '🧗': 'mountain',
  '🧟': 'skull', '🐻': 'paw-print', '⏮️': 'skip-back', '⌛': 'hourglass', '⚗️': 'flask-round',
  '⚪': 'circle', '🧅': 'layers', '⚔️': 'swords', '🔏': 'file-lock', '🎮': 'gamepad-2',
  '🖨️': 'printer', '🔣': 'type', '🧡': 'heart', '➖': 'minus', '🟩': 'square',
  'λ': 'square-function', '🚑': 'ambulance', '🔕': 'bell-off', '🔠': 'case-upper',
  '🙋': 'hand', '🎓': 'graduation-cap', '💰': 'coins', '🟠': 'circle', '☠️': 'skull',
  '⭐': 'star', '🔼': 'chevron-up', '🛣️': 'route', '🧳': 'briefcase',
};

// Some of the leftovers are products, not concepts: those get their real mark.
const BRANDS = {
  '🦀': 'rust', '🐧': 'linux', '🐘': 'postgresql', '🍎': 'apple', '☕': 'openjdk',
  '🐍': 'python', '🐳': 'docker', '🐙': 'github', '🦊': 'gitlab', '🐹': 'go',
};

const lucide = new Set(
  readdirSync(LUCIDE_DIR).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3)),
);
const unknown = [
  ...Object.entries(CONCEPTS).filter(([, n]) => !lucide.has(n)),
  ...Object.entries(BRANDS).filter(([, n]) => !existsSync(`${BRAND_DIR}/${n}.svg`)),
];
if (unknown.length) {
  console.error('Iconos que no existen:');
  for (const [emoji, name] of unknown) console.error(`  ${emoji} -> ${name}`);
  process.exit(1);
}

const pascal = (kebab) => kebab.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const conceptNames = [...new Set(Object.values(CONCEPTS))].sort();
const brandNames = [...new Set(Object.values(BRANDS))].sort();
const total = Object.keys(CONCEPTS).length + Object.keys(BRANDS).length;

const body = `import type { AstroComponent } from '@lucide/astro';

${conceptNames.map((n) => `import ${pascal(n)} from '@lucide/astro/icons/${n}';`).join('\n')}

${brandNames.map((n) => `import ${pascal(n)}Mark from 'simple-icons/icons/${n}.svg';`).join('\n')}

/**
 * Generated by scripts/build-card-icons.mjs — edit the map there, not here.
 *
 * The lessons decorate <Card> with an emoji. Resolving it to an icon keeps the
 * site on one visual language without touching a single .mdx: these ${total}
 * entries cover ~96% of the calls, and anything unmapped still shows its glyph.
 */
const EMOJI_ICON: Record<string, AstroComponent> = {
${Object.entries(CONCEPTS).map(([e, n]) => `  '${e}': ${pascal(n)},`).join('\n')}
${Object.entries(BRANDS).map(([e, n]) => `  '${e}': ${pascal(n)}Mark,`).join('\n')}
};

/** The icon for a content emoji, or undefined to fall back to the glyph. */
export function iconForEmoji(glyph: string): AstroComponent | undefined {
  // Content carries the variation selector inconsistently; try it both ways.
  const bare = glyph.replace(/\\uFE0F/g, '');
  return EMOJI_ICON[glyph] ?? EMOJI_ICON[bare] ?? EMOJI_ICON[\`\${bare}\\uFE0F\`];
}
`;

writeFileSync(OUT, body);
console.log(`${OUT}: ${conceptNames.length + brandNames.length} iconos, ${total} emojis mapeados`);
