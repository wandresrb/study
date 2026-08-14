-- Solo si quieres más que el nativo: fuzzy fino, varias fuentes
-- ordenadas, snippets. Si lo instalas, apaga vim.o.autocomplete.
return {
  "saghen/blink.cmp",
  version = "1.*",
  dependencies = { "rafamadriz/friendly-snippets" },
  event = "InsertEnter",
  opts = {
    keymap = { preset = "default" },
    appearance = { nerd_font_variant = "mono" },
    sources = { default = { "lsp", "path", "snippets", "buffer" } },
    completion = {
      documentation = { auto_show = true, auto_show_delay_ms = 200 },
      ghost_text = { enabled = true },
      menu = { border = "rounded" },
    },
    signature = { enabled = true, window = { border = "rounded" } },
    fuzzy = { implementation = "prefer_rust_with_warning" },
  },
}
