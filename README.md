# Coder plugin for Cursor

Bundles skills for installing, configuring, and operating a self-hosted
[Coder](https://coder.com) deployment from [Cursor](https://cursor.com).

## Features

| Component | Feature | Description |
| --- | --- | --- |
| **Skill** | `setup` | Install and bootstrap a new Coder deployment on Docker, Kubernetes, or a VM, including the first admin user and first template. |
| **Skill** | `templates` | Create, edit, push, and version Coder templates (Terraform). |
| **Skill** | `modules` | Add or update modules from [registry.coder.com](https://registry.coder.com/modules) in an existing template, such as IDEs, AI agents, and dotfiles. |

The `setup`, `templates`, and `modules` skills are vendored from
[coder/skills](https://github.com/coder/skills). See [VENDOR.md](VENDOR.md).

## Prerequisites

- **Cursor** with AI features enabled.
- The skills use the Coder CLI and Terraform when available.

## Installation

1. Open **Customize > Plugins** in Cursor.
2. Search for **Coder** and open the plugin.
3. Choose **Add to Cursor**, then **Add Plugin**.

### Install from source

For a fork or a pre-release, place the plugin folder in
`~/.cursor/plugins/local/coder` and reload Cursor. See
[Cursor's plugin docs](https://cursor.com/docs/plugins).

## Verify

**Customize > Plugins** shows the Coder plugin as installed.

## Usage

| Ask the agent | What happens |
| --- | --- |
| "Set up Coder on this VM." | Uses the `setup` skill to install and bootstrap a deployment. |
| "Which templates can I use, and what parameters does `kubernetes` take?" | Uses the `templates` skill to inspect templates. |
| "Add JetBrains Gateway to my Docker template." | Uses the `modules` skill to add the registry module. |

## Self-hosted and air-gapped deployments

Everything in this plugin operates against your own deployment. Nothing is
sent to Coder Inc. The `setup`, `templates`, and `modules` skills read
[coder.com/docs](https://coder.com/docs) and
[registry.coder.com](https://registry.coder.com) for current details; in an
air-gapped environment they fall back to the knowledge in the skill itself.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
