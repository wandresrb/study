-- Neovim 0.12: los servidores son ficheros en la carpeta lsp/ del
-- runtimepath. Ni nvim-lspconfig ni mason son necesarios.
-- El nombre del fichero es el nombre del servidor.
return {
  cmd = { "lua-language-server" },
  filetypes = { "lua" },
  root_markers = { ".luarc.json", ".luarc.jsonc", ".git" },
  settings = {
    Lua = {
      diagnostics = { globals = { "vim", "Snacks" } },
      workspace = { checkThirdParty = false },
      telemetry = { enable = false },
    },
  },
}
