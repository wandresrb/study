-- Config híbrida: vim.pack lleva el grueso, lazy.nvim lo que
-- gana con carga perezosa. Ver lección 1.2.

-- 1) Leader ANTES de cargar plugins
vim.g.mapleader = " "
vim.g.maplocalleader = " "

require("config.options")
require("config.keymaps")
require("config.autocmds")

-- 2) Lo que siempre está: gestor nativo de 0.12.
--    load = true porque lazy desactiva la carga automática de plugin/.
vim.g.no_plugin_maps = true   -- antes de textobjects
vim.pack.add({
  { src = "https://github.com/catppuccin/nvim", name = "catppuccin" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter", version = "main" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter-textobjects", version = "main" },
  { src = "https://github.com/nvim-mini/mini.nvim" },
}, { load = true })

require("config.tema")
require("config.treesitter")
require("mini.surround").setup({
  -- Prefijo gs: nativamente "dormir N segundos", o sea libre.
  -- Deja s y S para flash.nvim (leccion 2.3).
  mappings = {
    add = "gsa", delete = "gsd", replace = "gsr",
    find = "gsf", find_left = "gsF", highlight = "gsh",
  },
})
require("mini.pairs").setup({})
require("mini.ai").setup({
  -- mini.ai manda en el prefijo i, asi que el objeto "hunk" se registra
  -- AQUI y no en gitsigns: si los dos mapean i, el resultado depende de
  -- lo rapido que teclees. Ahora ih y ah son un hunk de Git.
  custom_textobjects = {
    h = function()
      local ok, gs = pcall(require, "gitsigns")
      if not ok then return nil end
      local hunks = gs.get_hunks()
      if not hunks then return nil end
      local fila = vim.fn.line(".")
      for _, h in ipairs(hunks) do
        local ini = h.added.start
        local fin = ini + math.max(h.added.count, 1) - 1
        if fila >= ini and fila <= fin then
          return {
            from = { line = ini, col = 1 },
            to   = { line = fin, col = math.max(#vim.fn.getline(fin), 1) },
          }
        end
      end
    end,
  },
})

-- 3) LSP y completado: nativos, sin plugin
require("config.lsp")
require("config.completado")

-- 4) Lo que gana con carga perezosa
require("config.lazy")
