# Plugins

Ready-to-install Claude Code plugins. Each subdirectory is one plugin with its own
`.claude-plugin/plugin.json`, a README, and `commands/` (slash commands), `agents/` or
`hooks/` as applicable.

| Plugin | Commands | What it does |
| --- | --- | --- |
| [handover](handover/) | `/handover:create`, `/handover:resume` | Evidence-backed session handover documents; resume verifies before it trusts |

## Install from this directory as a local marketplace

Claude Code installs plugins from a marketplace. A marketplace can be a local directory
that contains a `.claude-plugin/marketplace.json` listing its plugins. This directory is
set up to be one.

1. Register this directory as a marketplace (once per machine):

   ```bash
   claude plugin marketplace add /path/to/claude-recipes/plugins
   ```

   The marketplace name is the `name` field in
   [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json); here it is
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
3. Add the plugin to `.claude-plugin/marketplace.json` with `"source": "./<name>"`.
4. Keep the plugin free of anything that identifies a company, host or person; these are
   meant to travel.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
