# Inventory: commands and table template

Run from the repository root. Adjust the paths to the directories your `specPattern`
lists; the examples assume an app-level suite at `cypress/e2e/<domain>/` and
per-package suites at `packages/<feature>/e2e/`.

## Refresh commands

```bash
# App-level domains and spec-file counts
for d in cypress/e2e/*/; do
  echo "$d $(find "$d" \( -name '*.spec.ts' -o -name '*.cy.ts' \) | wc -l)"
done

# Per-package suites and counts
for d in packages/*/e2e; do
  [ -d "$d" ] && echo "$d $(find "$d" \( -name '*.cy.ts' -o -name '*.spec.ts' \) | wc -l)"
done

# Every per-domain script with its glob: trust the glob, not the script name
node -e "const s=require('./package.json').scripts; Object.keys(s).filter(k=>k.startsWith('e2e')).forEach(k=>console.log(k,'=',s[k]))"

# CI's automatic domain list (file and variable name are yours)
grep -rn "<ci-domain-list>" <ci-pipeline-files>

# Retry setting: decides whether a pass can hide a first-attempt failure
grep -n -A4 "retries" cypress.config.ts

# Traceable specs and covered tickets
grep -rlE 'PROJ-[0-9]+' <spec-dirs> | wc -l
grep -rhoE 'PROJ-[0-9]+' <spec-dirs> | sort -u
```

For each script, check that every directory in its glob exists. A glob with a dead
segment is a stale or partially stale script.

## Table template

Dated snapshot; counts are spec files. The rows are illustrative.

| Domain | Spec location | Files | Script | In CI's automatic list? |
| --- | --- | --- | --- | --- |
| checkout | `cypress/e2e/checkout/` | 9 | `<e2e-cmd>:checkout` | yes |
| catalogue | `packages/catalogue/e2e/` | 17 | `<e2e-cmd>:catalogue` | yes |
| navigation | `cypress/e2e/navigation/` | 4 | via the `shell` aggregate only | via `shell` |
| **account-settings** | `packages/account-settings/e2e/` | 2 | **none: orphan** | **no** |
| **wishlist** | `cypress/e2e/wishlist/` | 6 | script covers one subdirectory only | **partial** |

Below the table, record:

- **Totals**: E2E spec files (app-level plus per-package) and component-test files.
- **Orphans**: each suite with no script or no CI entry, with its file count.
- **Stale scripts**: each script with a dead glob segment, and whether it was fixed or
  deleted.
- **Traceability baseline**: specs carrying a ticket key, out of the total.
- **Wall-clock time per domain**, once Phase 2 starts recording it.
