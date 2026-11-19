# Build gates: E2E and browser verification

Both gates belong to Step 4 of [SKILL.md](SKILL.md). File names such as `00-state.md` and
`03-tests.md` are the handovers written by `ticket-pipeline`.

## Step 4a - E2E gate (decided per ticket, before the PR opens)

If the push hook runs only lint and unit tests and `<ci>` does not run E2E on feature
branches unless asked, the pipeline's tester is the only E2E run the PR gets.

1. **Decide.** E2E is needed when the change can alter behaviour the suites exercise:
   code every request or page load passes through (interceptors, guards, bootstrap), a
   shared-library export with several consumers, or a user flow that has a spec. Map
   touched paths to domains by searching the spec directories, then to
   `<e2e-cmd>:<domain>` scripts. A test-only change, a copy change, or an area with no
   runnable suite (record why) needs none. Write `E2E gate: <domains> | none (<reason>)`
   into `00-state.md` before DEVELOP and pass the list to the tester.
2. **Gate.** When REVIEW returns, read the E2E counts in `03-tests.md`. Every listed
   domain must have run against stubbed network, with each failure either absent or
   **proven pre-existing by a control run on the unmodified base** (same spec, same
   failure, recorded). A failure without that proof, or a missing run, is blocking: set
   changes-requested and enter the fix loop; do not open the PR.
3. **Report.** The PR's evidence section carries per-domain counts and names any
   pre-existing failure with its proof; `pr-ready` repeats the counts.

## Step 4b - Browser verification of the fix (where possible)

Unit tests prove the unit; the team wants to see the bug gone in the product. If any
acceptance criterion is observable in a browser, invoke `browser-qa` after the PR is
open. Its rules apply in full: arm hooks before acting, never record what you did not
observe, read-only on live data.

Run against the branch's preview environment if `<ci>` deploys one, otherwise locally
from the pipeline worktree. Both usually need a logged-in session, and you never enter
credentials: if the browser is not already signed in, note "browser evidence owed: needs
a logged-in session" in the PR checklist and in `pr-ready`, and move on.

Evidence is always a **before and after pair** (before is the base branch or the
currently deployed build; after is the branch): the precise observation the criterion
names, such as a request count per endpoint over a fixed window, plus screenshots for
anything visual, saved under `<handover-dir>/<KEY>/evidence/`. Post it as a PR comment
titled `Browser verification - <AC ids>`, mirror one line to the ticket and to the chat
thread. A pair that does **not** show the fix is a blocking finding: reopen the fix
loop; do not post "verified".
