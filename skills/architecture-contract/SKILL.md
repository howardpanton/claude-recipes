---
name: architecture-contract
description: Use when making or reviewing a design decision that touches shared plumbing - adding an API endpoint, data service, route or feature app; changing auth, permissions, session storage, feature flags, the app-initializer chain or tenant switching; when tempted to upgrade or unpin a core dependency, replace a legacy state library or split a "god service" as a drive-by; or when a PR changes a fact an architecture document cites.
---

# Architecture Contract

## Overview

One page that states the design decisions the codebase stands on, the invariants that must
hold when anything changes, and the weak points that are known and deliberate, so nobody
breaks them by accident or "fixes" them by accident. Every cited fact carries the command
that re-verifies it.

## When to use

- Before designing a change that touches shared plumbing: auth, tenancy context, flags,
  initialisation order, the base data service, the URL resolver.
- When reviewing a PR that does, or that upgrades or unpins a core dependency.
- When tempted to refactor something that looks wrong: read section 4 first.

Not for: "where does X live" (a repo-navigator agent), what an entity *means* (a
domain-reference skill), flag mechanics (a config skill), a concrete error (`debugging-playbook`).

## The pattern

Write the contract for your repo in this order. Keep it to one page plus the verification
table; a section past ten rows is two concerns.

### 1. Load-bearing decisions

Table: `# | Decision | Why it is this way | Consequence you must respect`. Five to eight
rows: the things that would take a quarter to change. Repo shape, where logic may live, the
universal service pattern, the cross-cutting context bus, the auth model, the state approach,
the public-API discipline between packages.

### 2. Invariants

One subsection per invariant (`I1`, `I2`, ...). Each names the file that enforces it, what
breaks when it is violated (usually at runtime, not compile time) and a list of **Never**
statements. These are the rows a reviewer re-reads when a diff touches the cited file.

### 3. Known-weak points

Table: `# | Weak point | Detail`. Things everyone knows are not ideal and that are
*deliberate trade-offs or deferred work*. Stating them stops surprise; section 4 stops the
drive-by fix.

### 4. What NOT to fix casually

Table: `Do NOT casually... | Maps to | Because`. "Casually" means as a drive-by inside another
ticket, without its own ticket, plan and rollback story. Every row cites a weak point and the
evidence (a revert, an install failure, a cross-tenant leak) without the incident's date or
ticket.

### 5. Provenance & maintenance

The keep-current rule, verbatim:

> Any PR that changes a fact this file cites, or that resolves or introduces a weak point,
> MUST update this file in the same PR. The PR reviewer treats drift here as blocking.

Then a table `Fact | Re-verify with`: one shell one-liner per volatile fact. A scheduled
drift audit re-runs the column as the backstop.

## Worked example

One row of each kind, with neutral names, is in [worked-example.md](worked-example.md): a
decision (the universal data service), two invariants (an ordered app-initializer chain; a
session-storage tenancy contract) and a weak point with its "do not fix casually" entry (a
pinned dependency with a package-manager patch). The shape of the I2 row is the one to copy:

- **Never** add a tenant-scoped, session-cached service without adding its reset to both the
  tenant-switch handler and the logout cleanup. Miss it and users see the previous tenant's
  data: a cross-tenant leak, not a stale-UI bug.
- Re-verify: `grep -n 'resetStateData' src/app/app.component.ts src/app/app-cleanup.ts`

## Gotchas

- Line numbers rot in weeks; paths and grep commands rot in months. Cite the command, not the
  line.
- A weak point with no scheduled fix becomes a drive-by magnet. If it is deliberate, say so in
  the row; if it is deferred, name the initiative it is folded into.
- The keep-current rule works only if the PR reviewer (human or the `pr-review` skill) has
  "does this change a cited fact?" on its checklist. Put it there.
- Reverted work with no recorded rationale is still a settled battle. Record "reason
  UNVERIFIED; start from current `<integration-branch>`, not the old branch", so nobody
  re-lands it from the stale branch.
- Separate "verified against the repo" from "the repo owner says so". The second is still
  worth recording; mark it.

## Adapt to your repo

- `<integration-branch>`: the branch the contract is verified against; record its version
  in the Provenance section.
- Replace the worked example with your own D, I and W rows; keep the lettering so a review
  comment can cite `I2`.
- Fill the `Fact | Re-verify with` table with real one-liners and run each once before
  committing the skill.
- Name your sibling skills in "When to use" (repo navigator, domain reference, config skill);
  delete the ones you do not have.
- Add the keep-current rule to your `pr-review` checklist and to the drift audit, if you run one.

Origin: distilled from daily use on a large Angular monorepo of git submodules (Jira, Bitbucket, Jenkins).
