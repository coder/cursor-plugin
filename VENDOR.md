# Vendored skills

`plugins/coder/skills/workspaces`, `plugins/coder/skills/setup`,
`plugins/coder/skills/templates`, and `plugins/coder/skills/modules` are
vendored from [coder/skills](https://github.com/coder/skills) and committed
to `main`.

| | |
| --- | --- |
| **Repository** | https://github.com/coder/skills |
| **Pinned ref** | `pin` in [`.github/scripts/sync-skills-vendor.json`](.github/scripts/sync-skills-vendor.json) |

## Refreshing

1. Bump `pin` in `.github/scripts/sync-skills-vendor.json` to the new tag or
   commit.
2. Run the sync from the repository root:

   ```sh
   node .github/scripts/sync-skills.mjs
   ```

3. Bump `version` in `plugins/coder/.cursor-plugin/plugin.json` and
   `metadata.version` in `.cursor-plugin/marketplace.json`. Cursor skips
   installs whose version has not changed.
4. Add an entry to `plugins/coder/CHANGELOG.md` for the new version.
5. Run `node scripts/validate-template.mjs`.
6. Commit the pin bump, the regenerated skills, the version bump, and the
   changelog entry together.

Do not hand-edit the vendored directories. Fix them upstream in
`coder/skills` and re-sync.
