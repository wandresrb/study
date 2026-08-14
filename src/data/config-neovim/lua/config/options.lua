local opt = vim.opt

opt.number = true
opt.relativenumber = true
opt.tabstop = 2
opt.shiftwidth = 2
opt.expandtab = true
opt.smartindent = true
opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = false
opt.incsearch = true
opt.termguicolors = true
opt.signcolumn = "yes"
opt.cursorline = true
opt.scrolloff = 8
opt.wrap = false
opt.splitright = true
opt.splitbelow = true
opt.swapfile = false
opt.undofile = true
opt.clipboard = "unnamedplus"
opt.updatetime = 250
opt.timeoutlen = 400
opt.mouse = "a"

-- Plegado. foldlevelstart = 99 NO es opcional: sin él, con foldmethod
-- expr cada archivo se abre entero plegado. Si te pasa, zR lo abre todo.
opt.foldlevelstart = 99
opt.foldtext = ""          -- la línea plegada conserva su resaltado
opt.fillchars:append({ fold = " " })
