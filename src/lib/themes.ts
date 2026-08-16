// The single source of truth for the site's themes. The palettes live in
// tokens.css under [data-theme]; this is the list everything else reads so the
// set is not re-typed in the header, the pre-paint script and the palette.
export const THEMES = [
  { id: 'kanagawa', name: 'Kanagawa' },
  { id: 'catppuccin', name: 'Catppuccin' },
  { id: 'everforest', name: 'Everforest' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

/** Rendered by the server and applied pre-paint, so it must match tokens.css :root. */
export const DEFAULT_THEME: ThemeId = 'kanagawa';

export const THEME_IDS = THEMES.map((t) => t.id) as readonly ThemeId[];

export const isTheme = (v: unknown): v is ThemeId =>
  typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v);

/** Our theme id → the Shiki theme that matches it. Shiki keys the CSS variables
 *  it emits by these names, and prose.css selects on them per [data-theme].
 *  `as const` keeps the literals: Shiki types the values as theme names, not string. */
export const SHIKI_THEMES = {
  kanagawa: 'kanagawa-wave',
  catppuccin: 'catppuccin-mocha',
  everforest: 'everforest-dark',
} as const satisfies Record<ThemeId, string>;
