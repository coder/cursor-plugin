---
name: coder-agent
description: Delegate a task to a Coder Agent running on your Coder deployment, then supervise it to completion.
argument-hint: [task prompt]
---

# Delegate to a Coder Agent

Hand the given task to a Coder Agents chat — a server-side coding agent
on the user's Coder deployment — and supervise it until it finishes.
Keep every status update to one or two lines.

## Preconditions

The `coder_*` MCP tools must be available. If they are not, stop and
tell the user to set their deployment URL under Customize > Plugins >
Coder > Configure (no trailing slash) and connect the `coder` server in
Tools & MCP. Do not fall back to `curl` or the Coder CLI.

## 1. Build the prompt

The text after the command is the task. If it is empty, ask for one in
a single question.

Pass the task through as written. If it concerns the repository that is
open in Cursor, append the repository URL and current branch so the
agent can clone the right code — it runs server-side and cannot see
local files or uncommitted changes. If uncommitted work matters to the
task, say so and stop.

## 2. Create the chat

Call `coder_create_chat` with the prompt. Use the default model; only
when the user names a model, resolve it with
`coder_list_chat_model_configs` and pass `model_config_id` (and its
`organization_id`). Report the chat ID and status in one line.

## 3. Supervise

Loop `coder_await_chat` with `wait_secs: 120`.

- `requires_action`, or the wait ends with the agent asking something:
  read `coder_get_chat_messages`, surface the agent's question to the
  user verbatim, and relay their answer with `coder_send_chat_message`.
- `error`: report the failure from the transcript and stop.
- Still running after ~5 waits: give a one-line progress summary from
  the transcript and ask whether to keep waiting or check back later.
  Checking back later is `coder_get_chat` / `coder_await_chat` again in
  any future message.

If the user says stop or cancel, call `coder_interrupt_chat`. Archive a
chat only when explicitly asked.

## 4. Report

When the chat completes, summarize what the agent did from
`coder_get_chat_messages` in a few sentences: what changed, where
(branch, PR, or workspace), and anything it left for the user to do.
