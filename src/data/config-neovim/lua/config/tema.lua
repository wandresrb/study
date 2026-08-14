-- Va por vim.pack: un tema nunca se difiere. Si llega tarde,
-- ves el editor gris durante medio segundo.
require("catppuccin").setup({
  flavour = "mocha",   -- latte, frappe, macchiato, mocha
  integrations = {
    treesitter = true,
    native_lsp = { enabled = true },
    which_key = true,
    gitsigns = true,
  },
})
vim.cmd.colorscheme("catppuccin")
