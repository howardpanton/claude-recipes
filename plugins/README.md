# Plugins

Ready-to-install Claude Code plugins. Each subdirectory is one plugin with its own
`.claude-plugin/plugin.json`, a README, and `commands/` (slash commands), `agents/` or
`hooks/` as applicable.

| Plugin | Commands | What it does |
| --- | --- | --- |
| [handover](handover/) | `/handover:create`, `/handover:resume` | Evidence-backed session handover documents; resume verifies before it trusts |

The `handover` skill in `skills/handover/` and this plugin are the same recipe in two
shapes: the skill is the source and is what the `recipes` plugin ships; the plugin splits
it into two slash commands for people who want only handover.

## Install

Claude Code installs plugins from a marketplace: a repo or local directory with a
`.claude-plugin/marketplace.json` listing its plugins. The manifest for this library is at
the repository root, so the marketplace is the repo itself.

1. Register the marketplace (once per machine), from GitHub or from a local clone:

   ```bash
   claude plugin marketplace add howardpanton/claude-recipes
   claude plugin marketplace add /path/to/claude-recipes     # local clone
   ```

   The marketplace name is the `name` field in
   [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json); here it is
   `claude-recipes`.

2. Install a plugin from it:

   ```bash
   claude plugin install handover@claude-recipes
   ```

3. Restart Claude Code. The plugin's commands appear under their namespace, for example
   `/handover:create`.

To update after editing a plugin here, bump its `version` in `plugin.json` and run
`claude plugin update handover@claude-recipes` (or uninstall and reinstall). To remove the
marketplace: `claude plugin marketplace remove claude-recipes`.

## Adding a plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json` with `name`, `version`,
   `description`. No author block is required.
2. Add `commands/<command>.md` files with frontmatter (`description`, `argument-hint`,
   `allowed-tools`) and the prompt body. `$ARGUMENTS` carries what the user typed after
   the command.
3. Add the plugin to the root `.claude-plugin/marketplace.json` with
   `"source": "./plugins/<name>"`.
4. Keep the plugin free of anything that identifies a company, host or person; these are
   meant to travel.
