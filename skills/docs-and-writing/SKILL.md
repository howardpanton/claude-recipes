---
name: docs-and-writing
description: >-
  Use when writing or updating project documentation - "which doc do I update
  for X?", "what is the source of truth for flags/design/deployment?", editing
  the root instructions file (CLAUDE.md), `docs/*` or `.claude/instructions/*`;
  authoring or maintaining a skill under `.claude/skills/` (frontmatter,
  "Use when" descriptions, provenance sections); fixing a stale doc; or
  committing a doc-only change that must not cut a release.
---

# Docs and writing

## Overview

Every doc edit is also a prompt edit: humans and agents read the same files.
Each fact has exactly one owner-of-truth document; everything else points at
it instead of restating it.

## When to use

Any documentation change, any new or edited skill. Not for generated code docs
(JSDoc, Storybook), release notes, or the branch and commit rules for code
changes (`change-control` skill - this one covers doc-only commits).

## 1. Which document owns which truth

| Document | Owns | Does not own |
|---|---|---|
| `CLAUDE.md` (root instructions) | **Universal rules only**: commands, architecture map, non-negotiables, the skill routing table | Deep procedures, history, anything beyond a few lines per topic |
| `.claude/instructions/*.md` | Code-style and security rules, `@`-included into every session | Narrative |
| `.claude/skills/<name>/SKILL.md` | **Deep operational knowledge** per topic: procedures, gotchas, re-verification commands | Universal rules (reference them) |
| `docs/*.md` | **Inventories and how-tos**: feature-flag inventory, "add a new package", deployment process | Agent-facing conventions |
| `README.md` | Onboarding: clone, submodules, auth config, start | Anything a skill owns in depth |
| Investigation notes, sprint decks | Point-in-time records | Evergreen truth - never cite as current |

If `CLAUDE.md` grows past ~150 lines, a topic has outgrown it: move it to a
skill and leave a one-line route in the table.

## 2. Which doc to update for which change

Update the owner of truth **in the same PR** as the change. A convention that
exists only in someone's head or a chat thread does not exist.

| Change | Update |
|---|---|
| New or retired feature flag | `docs/feature-flags.md` (the inventory), then the flags skill's facts |
| New package / submodule | the "add a new package" doc; counts cited in skills |
| Process change (branching, gates, review bar) | `CLAUDE.md` + `change-control` skill |
| New or changed dev command | `CLAUDE.md` Commands + the skill owning that workflow |
| Code-style or security rule | `.claude/instructions/*` |
| Any fact a skill cites | that skill (section 4) |
| A settled decision (tried, reverted, superseded) | the ticket, so it stays findable; the owning skill's gotchas |

## 3. House style

1. Imperative runbook voice: "Run X. Check Y."
2. Copy-pasteable commands, exact, runnable from repo root, tried before
   written. A wrong runbook is worse than none.
3. Tables and checklists over prose.
4. Date-stamp volatile facts ("as of <date>: Angular X"). Undated "current"
   rots silently.
5. No oversell: unproven approaches are "candidate"; stubs are called stubs.
6. Define each project-specific term once; never re-teach the framework.
7. Unverifiable claims are marked `UNVERIFIED` or omitted.

## 4. Authoring and maintaining skills

```yaml
---
name: kebab-case-equal-to-the-directory-name
description: Use when <triggers> - <symptoms, exact error strings, phrasings a reader would type>.
---
```

- `description` is third person, starts "Use when", and is a **retrieval key,
  not an abstract**: triggers and symptoms only, never a workflow summary.
  Under 500 characters.
- Body order: `# Title`, `## Overview` (the principle in 1-2 sentences),
  `## When to use` naming the sibling to use instead, the procedure,
  `## Output format` where a document is produced, `## Gotchas`, provenance.
- Imperative voice, no narrative ("in one session we..."). Keep the lesson,
  drop the event.
- Heavy reference (templates, rubrics over ~80 lines) goes in a sibling file,
  linked by relative path; executable helpers in `scripts/`.
- Cross-reference siblings by name in prose, never by deep path.

**Provenance & maintenance** - every skill ends with one:

1. Authored/updated date and the commit it was verified against.
2. Sources read (files, history, who calibrated it and when).
3. A table of volatile facts, each with a one-line read-only re-verification
   command (`grep -n -A6 coverageThreshold jest.config.ts`).

**Keep-current rule:** a PR that changes a fact a skill cites updates that
skill in the same PR. The re-verify table makes it a two-minute job.

| Situation | Action |
|---|---|
| A cited fact changed | Update the skill: run its re-verify commands, fix, bump the date |
| New incident in a covered area | Extend that skill's gotchas |
| New recurring topic with no owner | New skill; read two existing ones first for style |
| One-off knowledge tied to one ticket | Not a skill: ticket, handover file or point-in-time doc |

## 5. Doc-only commits

- With a ticket: `[PROJ-123] Update feature-flags doc for <flag>` - no
  conventional type, so no release.
- Without: `docs(no-release): <subject>`. On the integration branch
  semantic-release may treat `docs:` (and `chore:`, `test:`, `ci:`, `style:`,
  `build:`) as a patch release; `no-release` maps to `"release": false` in
  `.releaserc`. A plain `docs:` cuts a version and redeploys.
- PR body: which doc of record changed, what fact changed, how you verified it.
- Doc PRs follow the normal PR flow; the pre-push gate passes untouched.

## Gotchas

- `docs/` can be gitignored at the root while holding tracked files; a new
  file there needs `git add -f` or it silently never lands.
- A parallel assistant configuration (another vendor's instructions folder)
  that nobody maintains will contradict the live one. Decide: mark it
  "unmaintained - do not sync or cite" in the root instructions, or delete it.
- Don't half-update a stale spot: fix the one-liner in the same PR or leave it
  entirely alone.

## Adapt to your repo

- Section 1: list your real docs; delete rows you don't have.
- `docs/feature-flags.md`, the "add a new package" doc: your inventory names.
- Section 5: copy the real release rules from your `.releaserc`, or delete the trap if you don't run semantic-release.
- Skill directory: `.claude/skills/` or wherever your library lives.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
