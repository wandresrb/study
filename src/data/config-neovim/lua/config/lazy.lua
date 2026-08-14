local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  vim.fn.system({
    "git", "clone", "--filter=blob:none", "--branch=stable",
    "https://github.com/folke/lazy.nvim.git", lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  spec = { { import = "plugins" } },   -- sin esto, lua/plugins/ no se lee
  install = { colorscheme = { "catppuccin" } },
  checker = { enabled = true, notify = false },
  ui = { border = "rounded" },

  -- Las dos claves de la convivencia con vim.pack:
  -- sin ellas, lazy reescribe el runtimepath y tira lo que vim.pack añadió.
  performance = {
    reset_packpath = false,
    rtp = { reset = false },
  },
})
