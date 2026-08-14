return {
  "folke/snacks.nvim",
  priority = 1000,
  lazy = false,
  opts = {
    picker = { enabled = true },
    explorer = { enabled = true },
    terminal = { enabled = true },
    dashboard = { enabled = true },
    indent = { enabled = true },
    notifier = { enabled = true },
    bigfile = { enabled = true },
  },
  keys = {
    { "<leader>ff", function() Snacks.picker.files() end, desc = "Buscar archivos" },
    { "<leader>fg", function() Snacks.picker.grep() end, desc = "Grep proyecto" },
    { "<leader>fb", function() Snacks.picker.buffers() end, desc = "Buffers" },
    { "<leader>fr", function() Snacks.picker.recent() end, desc = "Recientes" },
    { "<leader>fs", function() Snacks.picker.lsp_symbols() end, desc = "Símbolos" },
    { "<leader>e",  function() Snacks.explorer() end, desc = "Explorador" },
    { "<leader>tt", function() Snacks.terminal() end, desc = "Terminal" },
  },
}
