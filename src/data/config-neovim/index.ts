import init from './init.lua?raw';
import options from './lua/config/options.lua?raw';
import keymaps from './lua/config/keymaps.lua?raw';
import autocmds from './lua/config/autocmds.lua?raw';
import lazy from './lua/config/lazy.lua?raw';
import tema from './lua/config/tema.lua?raw';
import treesitter from './lua/config/treesitter.lua?raw';
import whichKey from './lua/plugins/which-key.lua?raw';
import snacks from './lua/plugins/snacks.lua?raw';
import luaLs from './lsp/lua_ls.lua?raw';
import lsp from './lua/config/lsp.lua?raw';
import completado from './lua/config/completado.lua?raw';
import completadoPlugin from './lua/plugins/completado.lua?raw';
import edicion from './lua/plugins/edicion.lua?raw';
import git from './lua/plugins/git.lua?raw';
import formatLint from './lua/plugins/format-lint.lua?raw';

export interface ConfigFile {
  path: string;
  code: string;
  note?: string;
}

export const CONFIG_FILES: ConfigFile[] = [
  { path: 'init.lua', code: init },
  { path: 'lua/config/options.lua', code: options },
  { path: 'lua/config/keymaps.lua', code: keymaps },
  { path: 'lua/config/autocmds.lua', code: autocmds },
  { path: 'lua/config/lazy.lua', code: lazy },
  { path: 'lua/config/tema.lua', code: tema },
  { path: 'lua/config/treesitter.lua', code: treesitter },
  { path: 'lua/plugins/which-key.lua', code: whichKey },
  { path: 'lua/plugins/snacks.lua', code: snacks },
  { path: 'lsp/lua_ls.lua', code: luaLs },
  { path: 'lua/config/lsp.lua', code: lsp },
  { path: 'lua/config/completado.lua', code: completado },
  { path: 'lua/plugins/completado.lua', code: completadoPlugin, note: 'opcional' },
  { path: 'lua/plugins/edicion.lua', code: edicion },
  { path: 'lua/plugins/git.lua', code: git },
  { path: 'lua/plugins/format-lint.lua', code: formatLint },
];
