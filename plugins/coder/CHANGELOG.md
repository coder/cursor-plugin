# Changelog

## 0.3.0

- Made the plugin an [Agent Plugins 1.0](https://github.com/agentplugins/agent-plugins-spec) package so Codex, GitHub Copilot, and other conformant clients can load it: added a portable `plugin.json` next to `.cursor-plugin/plugin.json`.
- Re-vendored `coder/skills` at `3c99837`: the `workspaces` skill is now named `workspaces`, matching its directory, as the Agent Skills spec requires. It was `coder-workspaces`.
- `scripts/validate-template.mjs` now checks `plugin.json`, `mcp.json`, skill names, and that both manifests agree. CI also requires all three versions to match.
- Moved the Coder MCP server from `mcp.json` to `.cursor-plugin/mcp.json`, referenced by `mcpServers` in the Cursor manifest. Its URL uses the `${CODER_URL}` plugin variable, which Agent Plugins does not allow in `url`, so the server and `/coder-agent` work only in Cursor. Other clients no longer see an invalid MCP entry.

## 0.2.0

- Added the Coder remote MCP server (`mcp.json`) and the `/coder-agent` command for delegating tasks to Coder Agents chats. Requires Coder v2.38 or later, with the `mcp-server-http` experiment and `CODER_OAUTH2_PROVIDER_ENABLE=true`.

## 0.1.0

- Added the `workspaces` skill (vendored from [coder/skills](https://github.com/coder/skills)): list, inspect, create, start, stop, and delete workspaces; run commands and edit files over `coder ssh`; forward ports; read logs. Uses the `coder` CLI, no MCP server required.

## 0.0.1

- Initial release: `setup`, `templates`, and `modules` skills vendored from [coder/skills](https://github.com/coder/skills).
