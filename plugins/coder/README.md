# Coder

Skills to install, configure, and operate a self-hosted Coder deployment
from Cursor, plus the Coder MCP server for delegating tasks to Coder
Agents.

## Included

- `skills/workspaces/`, `skills/setup/`, `skills/templates/`, `skills/modules/`: vendored from [coder/skills](https://github.com/coder/skills)
- `mcp.json`: Coder remote MCP server at `${CODER_URL}/api/experimental/mcp/http`, where `${CODER_URL}` is the plugin variable the user sets under **Configure** (not a shell environment variable). Used by `/coder-agent`.
- `commands/coder-agent.md`: delegate a task to a Coder Agent and supervise it, through MCP

See the [repository README](../../README.md) for setup and usage, and
[CHANGELOG.md](CHANGELOG.md) for release history.
