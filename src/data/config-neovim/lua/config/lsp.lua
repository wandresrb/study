-- Enciende los servidores declarados en lsp/*.lua. Una sola línea.
vim.lsp.enable({
  "lua_ls", "clangd", "vtsls", "tailwindcss",
  "cssls", "html", "emmet_language_server", "jsonls", "yamlls",
})

-- OJO: en 0.12 estos atajos YA EXISTEN de fábrica. No los remapees.
--   grn  renombrar          gra  code action
--   grr  referencias        gri  implementaciones
--   grt  definición de tipo gO   símbolos del documento
--   K    hover              CTRL-]  ir a definición
--   CTRL-S (Insert) ayuda de firma
--   ]d / [d diagnósticos    CTRL-W d  diagnóstico flotante
--   an / in (Visual) rango de selección
-- Solo añade lo que falte, y siempre detrás de <leader>.
vim.api.nvim_create_autocmd("LspAttach", {
  group = vim.api.nvim_create_augroup("lsp_attach", { clear = true }),
  callback = function(ev)
    local cliente = vim.lsp.get_client_by_id(ev.data.client_id)
    local map = function(k, fn, desc)
      vim.keymap.set("n", k, fn, { buffer = ev.buf, desc = "LSP: " .. desc })
    end

    map("<leader>cf", function() vim.lsp.buf.format({ async = true }) end, "Formatear")
    map("<leader>cD", vim.lsp.buf.declaration, "Declaración")

    -- Capacidades condicionadas: solo si el servidor las soporta.
    if cliente and cliente:supports_method("textDocument/inlayHint") then
      map("<leader>ch", function()
        vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled({ bufnr = ev.buf }),
          { bufnr = ev.buf })
      end, "Inlay hints")
    end
    if cliente and cliente:supports_method("textDocument/codeLens") then
      vim.lsp.codelens.enable(true, { bufnr = ev.buf })  -- líneas virtuales en 0.12
    end
  end,
})

vim.diagnostic.config({
      virtual_text = { prefix = "●", spacing = 2 },
      underline = true,
      severity_sort = true,
      float = { border = "rounded", source = true },
      signs = {
        text = {
          [vim.diagnostic.severity.ERROR] = " ",
          [vim.diagnostic.severity.WARN]  = " ",
          [vim.diagnostic.severity.HINT]  = " ",
          [vim.diagnostic.severity.INFO]  = " ",
        },
      },
    })
