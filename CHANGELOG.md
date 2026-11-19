# Changelog

## 1.1.0 (2026-11-19)

- **Install as a plugin.** The marketplace manifest moved to the repository root, and a
  `recipes` plugin ships every skill and agent, so the library installs with
  `/plugin marketplace add` instead of five copy commands.
- **Git guard fixes.** `git-guards.sh` now parses the push refspec, so a push to a
  protected branch is blocked by full ref (`HEAD:refs/heads/main`), on any remote, and as a
  delete. New guards: force pushes (except `--force-with-lease`) and `git reset --hard`
  over uncommitted tracked changes. Hook tests went from 34 to 44.
- **Three new skills:** `e2e-coverage-campaign`, `release-notes`, `bug-board-sweep`.
- **Checks in the repo.** `tools/check.sh` runs the hook tests, frontmatter, link and scrub
  checks; a GitHub Actions workflow runs it on every push.
- **Examples.** `examples/` holds a filled-in `CLAUDE.md` and a handover document for a
  fictional repo.
- **Evals** for `pr-review` and `write-ticket`.
- MIT licence added. The per-file origin footer was removed (it cost context on every
  load); the origin is stated once in the README.
- `test-writer` and `instructions/coding-guidelines.md` are labelled as Angular and Jest
  worked examples.

## 1.0.0 (2026-11-06)

Initial library: 20 skills, 10 agents, 5 hooks with a test runner, 4 mods, the handover
plugin, 5 lessons files, the memory and evals pattern docs, templates.
