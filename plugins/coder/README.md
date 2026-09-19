# Coder

Skills for installing, configuring, and operating a self-hosted Coder
deployment from the Cursor IDE, plus the Coder MCP server for managing
and using the deployment: workspaces, templates, and Coder Agents.

## Included

- `skills/workspaces/`, `skills/setup/`, `skills/templates/`, `skills/modules/`: vendored from [coder/skills](https://github.com/coder/skills)
- `mcp.json`: Coder remote MCP server at `${CODER_URL}/api/experimental/mcp/http`, where `${CODER_URL}` is the plugin variable the user sets under **Configure** (not a shell environment variable). Gives the agent Coder's tools for workspaces, templates, files, and Coder Agents chats; `/coder-agent` builds on it.
- `commands/coder-agent.md`: delegate a task to a Coder Agent and supervise it, through MCP

See the [repository README](../../README.md) for setup and usage, and
[CHANGELOG.md](CHANGELOG.md) for release history.
