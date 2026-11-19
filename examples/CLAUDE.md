# CLAUDE.md

> Example: `CLAUDE.md.template` filled in for a fictional repo, `acme/widgets-console`.
> Every name, command and path here is invented. Compare it with the template to see
> which parts are placeholders and which are rules worth keeping word for word.

Guidance for Claude Code in this repository. This file holds the universal rules; deep
operational knowledge lives in the skill library (`.claude/skills/`). Invoke the owning skill
before working in its area (routing table below).

## What this repo is

Widgets Console is the back-office web app shop staff use to manage orders, invoices and the
product catalogue.

An Angular monorepo of git submodules: each `apps/*` is its own repository; `libs/shared/*`
and `src/` belong to the parent repo. Before editing, confirm which repo owns the file:
committing in the wrong repo, or bumping a submodule pointer by accident, is a real and
recurring failure.

## Non-negotiables

These are the rules most often broken by past sessions. They are not optional.

1. **Prior art before new code.** Before writing any new component, service or pattern,
   search `libs/shared/*` and the sibling apps for an existing one. In your plan or PR, name
   the pattern you followed, or state explicitly that none exists. Never duplicate what
   `libs/shared/ui` or an existing data service already provides.
2. **Evidence before "done".** Never claim a change works without showing proof:
   - Run the affected unit tests **with coverage** and paste the actual output. "Tests pass"
     without numbers is an unverified claim.
   - Run the linter on every changed source file (`npm run lint -- <project>`), mirroring the
     pre-push hook.
   - For anything user-visible: run the app against the mock server and show a screenshot of
     the behaviour. When behaviour in an E2E-covered area changed, run the matching E2E suite.
3. **The deliverable is an open PR with evidence.** Finished coding work ends with the branch
   pushed and a PR to `develop` whose description includes the test results and the coverage
   proof. **A human merges. Never merge yourself.**

## Commands

```bash
npm ci                                    # Install dependencies
git submodule update --init --recursive   # Once after clone
npm start                                 # Dev server at http://localhost:4200
npm run lint -- orders                    # Lint one project
npm test                                  # All unit tests, once
npm test -- --testFile=apps/orders/src/lib/order-list/order-list.component.spec.ts
npm run test:coverage                     # Unit tests with coverage
npm run e2e                               # E2E, headless, always against the mock server
npm run e2e:orders                        # E2E for one domain
```

Local auth setup, toolchain versions and environment recovery: the `setup-dev` skill.

## Architecture

```
src/app/          # App shell: routing, global init, composition only. No business logic.
apps/             # Feature apps (orders, invoices, catalogue), lazy-loaded by the shell
libs/shared/      # Cross-app utilities, services, components (parent repo)
```

- Apps are consumed through `@widgets/*` path aliases. Always import through each package's
  `index.ts` barrel, never deep paths.
- Key aliases: `@widgets/data-access` (API services, guards, resolvers, models),
  `@widgets/ui` (design system), `@widgets/utils`, `@widgets/testing`.
- **Data services**: everything in `libs/shared/data-access` extends `BaseDataService<T>`
  (HTTP CRUD, loading state, observable streams). API URLs resolve from the active shop in
  `sessionStorage`.
- **State**: RxJS in services; Signals for simple local component state; no global store.
- **Auth**: OpenID Connect, bootstrapped via `APP_INITIALIZER`; routes behind `AuthGuard`;
  permissions via `PermissionService`.
- **Feature flags**: inject `FlagsService`, call `isFeatureEnabled('flag-key')`. Inventory
  of record: `docs/feature-flags.md`. Loader mechanics: the `config-and-flags` skill.

Load-bearing invariants, deliberate weak points and what you must not refactor: the
`architecture-contract` skill. Domain vocabulary (order, invoice, credit note, shop): the
`domain-reference` skill.

## Skill routing

Invoke the owning skill **before** starting work in its area.

| Task | Skill |
| --- | --- |
| Start a ticket (branches, worktree) | `start-ticket` |
| Assess or improve a ticket | `assess-ticket` |
| Write a new ticket | `write-ticket` |
| Full autonomous ticket run | `ticket-pipeline` |
| Review a PR, branch or diff | `pr-review` |
| Write a PR title and description | `pr-description` |
| Branching, commit format, gate bypasses, submodule bumps | `change-control` |
| "How do I prove this works?" / the coverage gate | `validation-and-qa` |
| End-of-session handover | `handover` |
| Bug / failing test / runtime error | `debugging-playbook` |
| Colour, contrast, focus, ARIA | `accessibility` |

(The team installed eleven of the library's skills. Route only to skills that exist.)

## Code style

@.claude/instructions/coding-guidelines.md
@.claude/instructions/security.md

- New components must be standalone. No new NgModules.
- Modern control flow: `@if`, `@for`, `@switch`, not `*ngIf` / `*ngFor`.
- Component selector prefix `wc-` (kebab-case); directive prefix `wc` (camelCase).
- Styling: utility classes first; a stylesheet only when utilities cannot express it.
  Design system: `DESIGN.md`; colour and contrast rules: the `accessibility` skill.

## Git: branches, commits, releases

- Branch names: `feature/WID-123-description`.
- Never push directly to `develop` or `main`. PRs target `develop`.
- Commit format:
  - **Ticket work**: `[WID-123] Description`. Ticket-prefixed commits have no conventional
    type and never trigger a release.
  - **Everything else**: conventional `type(scope): subject`.
- **Release trap**: on `develop`, semantic-release maps `docs:`, `chore:`, `test:`, `ci:`,
  `style:` and `build:` to a **patch** and `refactor:` to a **minor**, so every "harmless"
  commit consumes a version. Use the scope `no-release` (`docs(no-release): ...`) when a
  change must not.
- Pipeline tokens: `[skip ci]`, `[e2e:all]`, `[e2e:orders]`; details in the
  `run-and-operate` skill.

## Pre-push quality gate

The `pre-push` hook enforces automatically:

1. The linter must pass on all changed source files.
2. Every changed `*.component.ts`, `*.service.ts`, `*.directive.ts`, `*.pipe.ts` and
   `*.guard.ts` must have a sibling `*.spec.ts`.
3. Unit tests run on affected files with coverage; global thresholds of 80% for statements,
   branches, functions and lines.

Bypass (`git push --no-verify`) is for hotfixes only; document the rationale in the PR
description. A hook in `.claude/settings.json` stops Claude from using it at all.

## Testing notes

- Unit test config: `jest.app.config.ts` for the shell; each app has its own
  `jest.config.ts`. Coverage output: `coverage/<app>/`.
- E2E always runs against the **mock server**, never a live environment. Cypress intercepts
  the feature-flag file; fixture patterns in `cypress/support/commands/`.
- Test-layer selection and what evidence counts: the `validation-and-qa` skill.

## Session hooks (already automated, don't duplicate)

`.claude/settings.json` blocks edits to protected files (`.env`, lockfiles,
`deploy-pins.yaml`), blocks credential-shaped content, blocks `git push --no-verify`, force
pushes and pushes to protected branches, blocks commits that stage a submodule pointer by
accident, and auto-runs Prettier on written source files. Don't hand-format, and don't try
to edit those protected files. Scripts and their tests: `.claude/hooks/`.
