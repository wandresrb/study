-- Neovim 0.12 completa solo, sin plugin. Prueba esto antes de instalar nada.
vim.o.autocomplete = true
vim.opt.completeopt = { "menuone", "popup", "noselect", "fuzzy" }

-- Enchufa el LSP al menú automático.
vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(ev)
    local cliente = vim.lsp.get_client_by_id(ev.data.client_id)
    if cliente and cliente:supports_method("textDocument/completion") then
      vim.lsp.completion.enable(true, ev.data.client_id, ev.buf, { autotrigger = true })
    end
  end,
})

-- Ctrl-Espacio invoca el menú a mano. Esta tecla es SOLO del completado:
-- no se la cedas a la selección incremental ni a un plugin de saltos o de IA.
vim.keymap.set("i", "<C-Space>", function() vim.lsp.completion.get() end,
  { desc = "Completado" })
