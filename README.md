# Coder plugin for Cursor

Bundles skills for installing, configuring, and operating a self-hosted
[Coder](https://coder.com) deployment from [Cursor](https://cursor.com), and
attaches Coder's remote MCP server for delegating work to Coder Agents.

## Features

| Component | Feature | Description |
| --- | --- | --- |
| **Skill** | `workspaces` | Operate a Coder deployment through the `coder` CLI: list, inspect, create, start, stop, and delete workspaces; run commands and edit files over `coder ssh`; forward ports; read logs. |
| **Skill** | `setup` | Install and bootstrap a new Coder deployment on Docker, Kubernetes, or a VM, including the first admin user and first template. |
| **Skill** | `templates` | Create, edit, push, and version Coder templates (Terraform). |
| **Skill** | `modules` | Add or update modules from [registry.coder.com](https://registry.coder.com/modules) in an existing template, such as IDEs, AI agents, and dotfiles. |
| **MCP** | Coder MCP server | Remote MCP server at `${CODER_URL}/api/experimental/mcp/http`, authenticated with OAuth2. Used only by `/coder-agent` to create and supervise Coder Agents chats. |
| **Command** | `/coder-agent` | Delegate a task to a Coder Agent on your deployment and supervise it: create the chat, relay questions, and report the outcome. Requires the MCP server. |

The `workspaces`, `setup`, `templates`, and `modules` skills are vendored
from [coder/skills](https://github.com/coder/skills). See [VENDOR.md](VENDOR.md).

## Prerequisites

- **Coder CLI** on `PATH` and logged in (`coder login <deployment-url>`).
  Used by the `workspaces`, `setup`, `templates`, and `modules` skills;
  none of them require the MCP server.
- **Cursor** with AI features enabled.
- Only for `/coder-agent`: a **Coder deployment on v2.38 or later**, with
  the remote MCP server and the OAuth2 provider enabled:

  ```sh
  CODER_EXPERIMENTS=mcp-server-http CODER_OAUTH2_PROVIDER_ENABLE=true coder server
  ```

  As of v2.38, `oauth2` is a GA feature turned on with
  `CODER_OAUTH2_PROVIDER_ENABLE=true`, no longer an experiment.
  `mcp-server-http` is still experimental. See the
  [MCP server docs](https://coder.com/docs/ai-coder/mcp-server#remote-mcp-server)
  and the
  [OAuth2 provider docs](https://coder.com/docs/admin/integrations/oauth2-provider).
- **Your Coder access URL**, for example `https://coder.example.com` (no
  trailing slash). Cursor asks for it when the plugin is installed and only
  `/coder-agent` uses it; the skills work without it.

## Installation

1. Open **Customize > Plugins** in Cursor.
2. Search for **Coder** and open the plugin.
3. Choose **Add to Cursor**, then **Add Plugin**.
4. Enter your access URL when Cursor asks for it, or later under
   **Customize > Plugins > Coder > Configure**.
5. To use `/coder-agent`, connect the `coder` server in **Tools & MCP** and
   sign in through the browser. The skills need no further setup.

The configured URL persists across plugin updates. Team admins can set it
for everyone in the Cursor dashboard under **Plugins > Configure**.

> [!NOTE]
> `CODER_URL` is a plugin variable, not an environment variable. Cursor
> resolves `${CODER_URL}` in `mcp.json` from what you enter under
> **Configure**; a `CODER_URL` exported in the shell Cursor was launched
> from is not picked up, even inside a Coder workspace.

### Install from source

For a fork or a pre-release, place the plugin folder in
`~/.cursor/plugins/local/coder` and reload Cursor. See
[Cursor's plugin docs](https://cursor.com/docs/plugins).

## Verify

1. **Customize > Plugins** shows the Coder plugin as installed.
2. Ask the agent: "List my Coder workspaces." It should run `coder list`.
3. For `/coder-agent`: **Cursor Settings > Tools & MCP** shows the `coder`
   server as connected, and asking "Who am I on Coder?" calls
   `coder_get_authenticated_user`.

## Authentication

For `/coder-agent`, Cursor discovers Coder's OAuth2 endpoints through
[RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728) and prompts you to
sign in through your browser on first use. No tokens are stored in the
plugin.

If your deployment cannot use OAuth2, create a token under **Settings >
Tokens** in the Coder UI and add it as a `Coder-Session-Token` header on the
`coder` server in Cursor's MCP settings.

The `workspaces`, `setup`, `templates`, and `modules` skills instead use
whatever session the `coder` CLI already has from `coder login`.

## Usage

| Ask the agent | What happens |
| --- | --- |
| "List my workspaces." | Runs `coder list -o json`. |
| "Start my `backend` workspace and tail the build logs." | Runs `coder start` and follows `coder logs`. |
| "Run the tests in my `api` workspace." | Runs `coder ssh api -- <command>`. |
| "Which templates can I use, and what parameters does `kubernetes` take?" | Uses the `templates` skill to inspect templates. |
| "Add JetBrains Gateway to my Docker template." | Uses the `modules` skill to add the registry module. |
| "Set up Coder on this VM." | Uses the `setup` skill to install and bootstrap a deployment. |
| "Delegate this refactor to a Coder Agent and tell me when it's done." | Creates a Coder Agents chat with `coder_create_chat` and waits with `coder_await_chat`. |

## Self-hosted and air-gapped deployments

Everything in this plugin operates against your own deployment. Nothing is
sent to Coder Inc. The `setup`, `templates`, and `modules` skills read
[coder.com/docs](https://coder.com/docs) and
[registry.coder.com](https://registry.coder.com) for current details; in an
air-gapped environment they fall back to the knowledge in the skill itself.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `coder: command not found` | Install the CLI: `curl -fsSL https://coder.com/install.sh \| sh`. |
| Workspace commands fail with an auth error | Run `coder login <deployment-url>`. |
| No `coder_*` tools in the agent (`/coder-agent`) | Reconnect the `coder` server in **Tools & MCP**. |
| `coder` server shows a literal `${CODER_URL}` URL or an Invalid URL error | The URL has not been configured. Set it under **Customize > Plugins > Coder > Configure**, without a trailing slash. |
| `404` from the MCP endpoint, with `//api/experimental/` in the URL | The configured URL has a trailing slash. Remove it under **Configure** — the path is appended verbatim, so a trailing slash produces a double slash. |
| `404` from the MCP endpoint, URL otherwise correct | The deployment is missing the `mcp-server-http` experiment, or is older than v2.38. |
| `Unauthorized` on every MCP tool call | Reconnect the `coder` server in **Tools & MCP**, or your token expired. |
| OAuth browser login never completes | Check the browser can reach your Coder access URL and that `CODER_OAUTH2_PROVIDER_ENABLE=true` is set. |

More in the [MCP server troubleshooting docs](https://coder.com/docs/ai-coder/mcp-server#troubleshooting).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
