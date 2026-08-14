local aug = vim.api.nvim_create_augroup
local au = vim.api.nvim_create_autocmd

au("TextYankPost", {
  group = aug("resaltar_yank", { clear = true }),
  callback = function() vim.hl.on_yank({ timeout = 200 }) end,
})

au("BufWritePre", {
  group = aug("limpiar_espacios", { clear = true }),
  pattern = "*",
  command = [[%s/\s\+$//e]],
})

au("BufReadPost", {
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    if mark[1] > 0 and mark[1] <= vim.api.nvim_buf_line_count(0) then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})
