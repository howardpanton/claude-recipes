# Area map: feature language -> package or submodule

Used by `start-ticket` (step 3) and by the `ticket-pipeline` planner to turn
the words in a ticket into a path. The table is the primary lookup; the
workspace config is only for checking the table is still current.

| Feature language (as tickets phrase it)      | Path                       | Kind      | Remote (submodules only)                         |
| -------------------------------------------- | -------------------------- | --------- | ------------------------------------------------ |
| billing, invoices, payment history           | `apps/billing`             | submodule | `git@<git-host>:<org>/billing-ui.git`            |
| search, global search, search results        | `apps/search`              | submodule | `git@<git-host>:<org>/search-ui.git`             |
| account settings, profile, preferences       | `apps/account-settings`    | submodule | `git@<git-host>:<org>/account-settings-ui.git`   |
| login, auth, sign-in, permissions            | `apps/auth`                | submodule | `git@<git-host>:<org>/auth-ui.git`               |
| design system, shared component, table, dialog | `libs/shared/ui`         | root repo | -                                                |
| API service, data access, models, guards     | `libs/shared/data-access`  | root repo | -                                                |
| app shell, routing, global init              | `src/app`                  | root repo | -                                                |

## Disambiguation

Where one word names two things, add a row per meaning and the signal that
separates them. Example shape:

| Route or page title            | Owning path      | Note                                            |
| ------------------------------ | ---------------- | ----------------------------------------------- |
| `/reports` ("Reports")         | `apps/reporting` | the user-facing reports page                    |
| `/admin/reports` ("Report jobs") | `apps/admin`   | the batch-job admin screen, not the reports page |

The package named after a feature is not always the package that renders it.
Check the route before picking a path.

## Usage notes

- Exact phrase matches beat fuzzy ones. Several rows plausibly match: list
  every candidate in the plan and ask.
- No row matches: root repo only, and say so in the plan.
- Keep this current. When `.gitmodules` or the workspace config changes,
  update this file in the same PR. A stale map sends branches to the wrong
  repo, the most expensive mistake `start-ticket` can make.

Re-verify: `git config --file .gitmodules --get-regexp path` lists every
submodule path; diff it against the Path column.
