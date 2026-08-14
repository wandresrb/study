return {
  {
    "folke/flash.nvim",
    event = "VeryLazy",
    opts = {},
    keys = {
      -- NO en s / S: son verbos nativos de Vim y s es el prefijo de
      -- operador de mini.surround (sa, sd, sr). Cederlas rompe surround
      -- de forma intermitente, según qué plugin cargue último.
      { "s", mode = { "n", "x", "o" }, function() require("flash").jump() end, desc = "Flash: saltar" },
      { "S", mode = { "n", "x", "o" }, function() require("flash").treesitter() end, desc = "Flash: nodo" },
    },
  },
  -- mini.surround, mini.pairs y mini.ai NO van aquí: los lleva vim.pack
  -- desde el init.lua. Declararlos en los dos sitios los instala dos veces.
  {
    "windwp/nvim-ts-autotag",
    ft = { "html", "javascriptreact", "typescriptreact", "tsx", "vue", "svelte", "xml" },
    opts = {},
  },
}
