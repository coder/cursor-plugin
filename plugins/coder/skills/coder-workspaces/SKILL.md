---
name: coder-workspaces
description: >
  Operate an existing Coder deployment through the Coder MCP server:
  list, inspect, create, start, stop, or delete workspaces; run
  commands and edit files inside a workspace; read build and agent
  logs; inspect templates and their parameters; and delegate work to
  Coder Agents chats. Use when the user mentions their Coder
  workspaces, templates, or deployment, or asks to run something "in
  my workspace". Do not use for installing Coder (use the setup
  skill) or authoring templates from scratch (use the templates
  skill).
---

# Coder workspaces

Drive a Coder deployment through the `coder` MCP server that ships with
this plugin. Every tool below is prefixed `coder_` and runs against the
deployment at `CODER_URL` as the authenticated user.

## Preconditions

If no `coder_*` tools are available, the MCP server is not connected.
Stop and tell the user to set their deployment URL under Customize >
Plugins > Coder > Configure and connect the `coder` server in Tools &
MCP. Do not try to reach the Coder API with `curl` or the CLI instead.

## Workflow

1. Identify the user with `coder_get_authenticated_user` when the
   request depends on who owns a workspace or which organization is in
   play.
2. Find the target:
   - `coder_list_workspaces` for the user's workspaces (filter by
     `owner` when asked about someone else's).
   - `coder_get_workspace` for full detail on one workspace. Prefer
     this over re-listing.
   - `coder_list_templates` then `coder_get_template` to discover
     templates, presets, and parameters before creating anything.
3. Act with the narrowest tool that does the job (see tables below).
4. Verify. After a build, read `coder_get_workspace_build_logs`;
   after a start, confirm the agent is ready with
   `coder_get_workspace_agent_logs` or `coder_get_workspace`.
5. Report the outcome in one or two sentences, including the workspace
   name and its current status.

## Tool reference

### Workspaces

| Task | Tool |
| --- | --- |
| List my workspaces | `coder_list_workspaces` |
| Inspect one workspace | `coder_get_workspace` |
| Create a workspace | `coder_create_workspace` (needs a template; pass `template_version_preset_id` or `rich_parameters` from `coder_get_template`) |
| Start, stop, or delete | `coder_create_workspace_build` with `transition` set to `start`, `stop`, or `delete` |
| Build progress or failure | `coder_get_workspace_build_logs` |
| Startup script output | `coder_get_workspace_agent_logs` |

### Inside a workspace

| Task | Tool |
| --- | --- |
| Run a shell command | `coder_workspace_bash` |
| List a directory | `coder_workspace_ls` |
| Read a file | `coder_workspace_read_file` |
| Write a new file | `coder_workspace_write_file` |
| Edit existing files | `coder_workspace_edit_file` or `coder_workspace_edit_files` |
| Open a dev server | `coder_workspace_port_forward` returns the forwarded URL |
| Find running apps (IDE, terminal, previews) | `coder_workspace_list_apps` |

### Templates

| Task | Tool |
| --- | --- |
| List templates | `coder_list_templates` |
| Inspect parameters and presets | `coder_get_template`, `coder_template_version_parameters` |
| Push a new version | `coder_upload_tar_file` then `coder_create_template_version`; check `coder_get_template_version_logs` |
| Promote a version | `coder_update_template_active_version` |
| Create or delete a template | `coder_create_template`, `coder_delete_template` |

### Coder Agents (chats)

For "offload this task to a Coder Agent", follow the `/coder-agent`
command's flow: create the chat, supervise with awaits, relay
questions, and summarize the outcome.

| Task | Tool |
| --- | --- |
| Delegate a task to a Coder Agent | `coder_create_chat` then `coder_send_chat_message` |
| Wait for or check on a chat | `coder_await_chat`, `coder_get_chat`, `coder_get_chat_messages` |
| List or stop chats | `coder_list_chats`, `coder_interrupt_chat`, `coder_archive_chat` |
| Pick a model | `coder_list_chat_model_configs` |

## Rules

- Never delete a workspace or template without an explicit,
  separate confirmation from the user. `coder_delete_template` and the
  `delete` transition are irreversible.
- Prefer `stop` over `delete` when the user says "shut down" or
  "turn off".
- Stopping a workspace discards anything not on a persistent volume.
  Warn once before stopping if the user has been editing files.
- Do not paste session tokens, `Coder-Session-Token` headers, or
  OAuth secrets into chat, files, or shell commands.
- When a tool fails with `Unauthorized`, the user's session expired or
  the deployment lacks the `oauth2` and `mcp-server-http` experiments.
  Tell them to reconnect the `coder` server in Tools & MCP instead of
  retrying.
- Tool names and arguments are defined in Coder's `toolsdk` package
  and can change between releases. If a tool listed here is missing,
  use the closest available one and say so.
