# Changelog

## 0.3.0

- Added the `coder-templates` rule, which auto-attaches to `.tf` files and applies Coder template conventions when the file uses the `coder/coder` provider.
- Added the `coder-template-reviewer` subagent, a read-only reviewer that checks a template for build, lifecycle, parameter, module, and secret issues before it is pushed.

## 0.2.0

- Added the Coder remote MCP server (`mcp.json`) and the `/coder-agent` command for delegating tasks to Coder Agents chats. Requires Coder v2.38 or later, with the `mcp-server-http` experiment and `CODER_OAUTH2_PROVIDER_ENABLE=true`.

## 0.1.0

- Added the `workspaces` skill (vendored from [coder/skills](https://github.com/coder/skills)): list, inspect, create, start, stop, and delete workspaces; run commands and edit files over `coder ssh`; forward ports; read logs. Uses the `coder` CLI, no MCP server required.

## 0.0.1

- Initial release: `setup`, `templates`, and `modules` skills vendored from [coder/skills](https://github.com/coder/skills).
