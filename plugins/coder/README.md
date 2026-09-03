# Coder

Connect Cursor to your self-hosted Coder deployment.

## Included

- `mcp.json`: Coder remote MCP server at `${CODER_URL}/api/experimental/mcp/http`, resolved from the environment or the plugin's `CODER_URL` variable
- `skills/coder-workspaces/`: operate workspaces, templates, and Coder Agents through MCP tools
- `skills/setup/`, `skills/templates/`, `skills/modules/`: vendored from [coder/skills](https://github.com/coder/skills)
- `commands/coder-agent.md`: delegate a task to a Coder Agent and supervise it

See the [repository README](../../README.md) for setup and usage.
