-- Va por vim.pack: la rama main NO admite carga perezosa.
-- Es una reescritura incompatible: no existen nvim-treesitter.configs,
-- ensure_installed, highlight, indent ni incremental_selection.
-- El plugin SOLO instala parsers y aporta queries.

require("nvim-treesitter").install({
  "lua", "vim", "vimdoc", "c", "rust", "swift",
  "javascript", "typescript", "tsx", "html", "css",
  "json", "yaml", "toml", "markdown", "bash",
})

-- El resaltado y el plegado los da Neovim, no el plugin.
-- Sin lista de lenguajes: pregunta si hay parser y actúa.
vim.api.nvim_create_autocmd("FileType", {
  callback = function(args)
    local lang = vim.treesitter.language.get_lang(vim.bo[args.buf].filetype)
    if not lang or not vim.treesitter.language.add(lang) then return end
    vim.treesitter.start(args.buf, lang)
    -- Plegado por estructura. foldlevelstart = 99 está en options.lua:
    -- sin él, todo se abre plegado. za abre y cierra, zR abre todo.
    vim.wo[0][0].foldexpr = "v:lua.vim.treesitter.foldexpr()"
    vim.wo[0][0].foldmethod = "expr"
  end,
})

-- Objetos de texto. El plugin ya no mapea nada: las teclas son cosa tuya.
require("nvim-treesitter-textobjects").setup({
  select = { lookahead = true },
  move = { set_jumps = true },
})

local sel = require("nvim-treesitter-textobjects.select")
local mov = require("nvim-treesitter-textobjects.move")
local swp = require("nvim-treesitter-textobjects.swap")

for tecla, captura in pairs({
  af = "@function.outer",  ["if"] = "@function.inner",
  ac = "@class.outer",     ic    = "@class.inner",
  aa = "@parameter.outer", ia    = "@parameter.inner",
}) do
  vim.keymap.set({ "x", "o" }, tecla, function()
    sel.select_textobject(captura, "textobjects")
  end, { desc = "objeto " .. captura })
end

-- Saltos en ] y [, que es donde Vim los espera.
vim.keymap.set({ "n", "x", "o" }, "]f", function()
  mov.goto_next_start("@function.outer", "textobjects")
end, { desc = "siguiente funcion" })
vim.keymap.set({ "n", "x", "o" }, "[f", function()
  mov.goto_previous_start("@function.outer", "textobjects")
end, { desc = "funcion anterior" })

-- Acciones en <leader>. Ojo: <leader>ca es la code action del LSP.
vim.keymap.set("n", "<leader>cp", function()
  swp.swap_next("@parameter.inner")
end, { desc = "mover parametro adelante" })
vim.keymap.set("n", "<leader>cP", function()
  swp.swap_previous("@parameter.inner")
end, { desc = "mover parametro atras" })

-- Selección incremental: NO se configura. Neovim 0.12 la trae de serie en
-- modo Visual: an sube al nodo padre, in baja al hijo, ]n / [n van al nodo
-- siguiente o anterior, ]N / [N extienden la selección.
-- Nunca la mapees a <C-Space>: esa tecla es del autocompletado.
