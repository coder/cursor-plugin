# Coder plugin for Cursor

Connect [Cursor](https://cursor.com) to your self-hosted
[Coder](https://coder.com) deployment. The plugin attaches Coder's remote MCP
server to every session and bundles skills for installing, configuring, and
operating Coder.

## Features

| Component | Feature | Description |
| --- | --- | --- |
| **MCP** | Coder MCP server | Remote MCP server at `${CODER_URL}/api/experimental/mcp/http`, authenticated with OAuth2. Exposes tools for workspaces, templates, files, commands, port forwarding, and Coder Agents chats. |
| **Skill** | `coder-workspaces` | Operate a Coder deployment through the MCP tools: list, inspect, create, start, stop, and delete workspaces; run commands and edit files in a workspace; read logs; delegate work to Coder Agents. |
| **Skill** | `setup` | Install and bootstrap a new Coder deployment on Docker, Kubernetes, or a VM, including the first admin user and first template. |
| **Skill** | `templates` | Create, edit, push, and version Coder templates (Terraform). |
| **Skill** | `modules` | Add or update modules from [registry.coder.com](https://registry.coder.com/modules) in an existing template, such as IDEs, AI agents, and dotfiles. |
| **Command** | `/coder-agent` | Delegate a task to a Coder Agent on your deployment and supervise it: create the chat, relay questions, and report the outcome. |

The `setup`, `templates`, and `modules` skills are vendored from
[coder/skills](https://github.com/coder/skills). See [VENDOR.md](VENDOR.md).

## Prerequisites

- **Coder deployment** with the remote MCP server enabled. The endpoint
  requires the `oauth2` and `mcp-server-http` experiments:

  ```sh
  CODER_EXPERIMENTS=oauth2,mcp-server-http coder server
  ```

  See the [MCP server docs](https://coder.com/docs/ai-coder/mcp-server#remote-mcp-server).

- **Your Coder access URL**, for example `https://coder.example.com`
  (no trailing slash). Entered once after install.
- **Cursor** with AI features enabled.

The `setup`, `templates`, and `modules` skills use the Coder CLI and
Terraform when available. They do not require the MCP server.

## Installation

1. Open **Customize > Plugins** in Cursor.
2. Search for **Coder** and open the plugin.
3. Choose **Add to Cursor**, then **Add Plugin**.
4. Enter your access URL under **Customize > Plugins > Coder > Configure**,
   then connect the `coder` server in **Tools & MCP** and sign in through
   the browser.

The configured URL persists across plugin updates. Team admins can set it
for everyone in the Cursor dashboard under **Plugins > Configure**.

> [!NOTE]
> If `CODER_URL` is set in the environment Cursor is launched from — always
> true inside a Coder workspace — it takes precedence and no configuration
> is needed.

### Install from source

For a fork or a pre-release, place the plugin folder in
`~/.cursor/plugins/local/coder` and reload Cursor. See
[Cursor's plugin docs](https://cursor.com/docs/plugins).

## Verify

1. **Customize > Plugins** shows the Coder plugin as installed.
2. **Cursor Settings > Tools & MCP** shows the `coder` server as connected.
3. Ask the agent: "Who am I on Coder?" It should call
   `coder_get_authenticated_user` and return your username.

## Authentication

Cursor discovers Coder's OAuth2 endpoints through
[RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728) and prompts you to
sign in through your browser on first use. No tokens are stored in the plugin.

If your deployment cannot use OAuth2, create a token under **Settings >
Tokens** in the Coder UI and add it as a `Coder-Session-Token` header on the
`coder` server in Cursor's MCP settings.

## Usage

| Ask the agent | What happens |
| --- | --- |
| "List my workspaces." | Calls `coder_list_workspaces`. |
| "Start my `backend` workspace and tail the build logs." | Runs a `start` build and follows `coder_get_workspace_build_logs`. |
| "Run the tests in my `api` workspace." | Executes `coder_workspace_bash` in that workspace. |
| "Which templates can I use, and what parameters does `kubernetes` take?" | Calls `coder_list_templates` and `coder_get_template`. |
| "Delegate this refactor to a Coder Agent and tell me when it's done." | Creates a Coder Agents chat with `coder_create_chat` and waits with `coder_await_chat`. |
| "Add JetBrains Gateway to my Docker template." | Uses the `modules` skill to add the registry module. |
| "Set up Coder on this VM." | Uses the `setup` skill to install and bootstrap a deployment. |

## Self-hosted and air-gapped deployments

Everything in this plugin talks to your own deployment at `CODER_URL`.
Nothing is sent to Coder Inc. The `setup`, `templates`, and `modules` skills
read [coder.com/docs](https://coder.com/docs) and
[registry.coder.com](https://registry.coder.com) for current details; in an
air-gapped environment they fall back to the knowledge in the skill itself.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| No `coder_*` tools in the agent | Reconnect the `coder` server in **Tools & MCP**. |
| `coder` server shows a literal `${CODER_URL}` URL or an Invalid URL error | The URL has not been configured. Set it under **Customize > Plugins > Coder > Configure**, without a trailing slash. |
| `404` from the MCP endpoint | The deployment is missing the `oauth2` and `mcp-server-http` experiments. |
| `Unauthorized` on every tool call | Reconnect the `coder` server in **Tools & MCP**, or your token expired. |
| OAuth browser login never completes | Check the browser can reach your Coder access URL and that `oauth2` is enabled. |

More in the [MCP server troubleshooting docs](https://coder.com/docs/ai-coder/mcp-server#troubleshooting).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
