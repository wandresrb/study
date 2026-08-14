return {
  {
    "lewis6991/gitsigns.nvim",
    event = { "BufReadPre", "BufNewFile" },
    opts = {
      -- Los seis signos: uno vacío hace ese cambio invisible.
      signs = {
        add          = { text = "▎" },
        change       = { text = "▎" },
        delete       = { text = "_" },
        topdelete    = { text = "‾" },
        changedelete = { text = "~" },
        untracked    = { text = "┆" },
      },
      on_attach = function(buf)
        local gs = require("gitsigns")
        local map = function(modo, k, fn, desc)
          vim.keymap.set(modo, k, fn, { buffer = buf, desc = desc })
        end

        -- Saltos repetibles con ; y ,
        local ok, rep = pcall(require, "nvim-treesitter-textobjects.repeatable_move")
        local ir = ok
          and rep.make_repeatable_move(function(o) gs.nav_hunk(o.forward and "next" or "prev") end)
          or function(o) gs.nav_hunk(o.forward and "next" or "prev") end

        map("n", "]h", function() ir({ forward = true }) end, "Siguiente hunk")
        map("n", "[h", function() ir({ forward = false }) end, "Hunk anterior")

        map("n", "<leader>hs", gs.stage_hunk, "Stage hunk")
        map("n", "<leader>hr", gs.reset_hunk, "Reset hunk")
        -- En Visual hay que pasar el rango: sin él hace el hunk entero.
        map("x", "<leader>hs", function()
          gs.stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
        end, "Stage de la selección")
        map("x", "<leader>hr", function()
          gs.reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
        end, "Reset de la selección")

        map("n", "<leader>hp", gs.preview_hunk, "Preview hunk")
        map("n", "<leader>hb", function() gs.blame_line({ full = true }) end, "Blame")
      end,
    },
  },
  {
    "kdheepak/lazygit.nvim",
    cmd = { "LazyGit" },
    keys = { { "<leader>gg", "<cmd>LazyGit<cr>", desc = "LazyGit" } },
  },
}
