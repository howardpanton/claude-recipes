# Ticket pipeline: external side effects (orchestrator-owned)

Supporting file for the `ticket-pipeline` skill. Everything here leaves the
machine, so it runs in the orchestrator only. The stage agents have no
tracker or git-host tools; a stage that reports needing one is a bug in the
split, not a reason to hand it a tool. One audit point, least privilege per
agent, and connector names that only have to be right in one place.

`--eval` disables this whole file except the read-only ticket snapshot.

## 1. Tracker pickup (setup step 6)

Only when the run advances past ASSESS. A `design` or `Pipelineable: no`
stop changes nothing on the ticket.

- Identify the runner (**Jira:** `atlassianUserInfo`; **GitHub:**
  `gh api user --jq .login`) and record `Runner: <name>` in `00-state.md`.
- Transition to **In Progress** unless already in an in-progress category.
- Assign to the runner if unassigned; leave a different assignee alone and
  note it.
- A failed call is logged to `00-state.md` and never stops the pipeline.

## 2. Applying the assessor's tracker edits (before PLAN)

`00-assess.md` -> `## Proposed tracker edits` has three parts. Record each
applied part in `00-state.md`.

| Part                    | Jira                                                                | GitHub                                          |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| Replacement description | `editJiraIssue` `fields.description`, `contentFormat: markdown`     | `gh issue edit <n> --body-file <file>`          |
| Field changes           | `editJiraIssue`; multi-value fields are replaced whole, send the full list | `gh issue edit --add-label/--remove-label` |
| Issue links             | `createJiraIssueLink` (`Relates`, `Blocks`; find the operation with `discover` if renamed) | a "Relates to #n" line in the body |

"unchanged" means skip. Trackers keep description history, so this is
reversible. A failed call is logged and never blocks PLAN.

## 3. Push, PR and comments (after REVIEW, any verdict, and every fix cycle)

All git commands run in `WORKTREE`.

1. **Push** every branch under `## Branches to push` in `04-review.md`,
   submodules first, then root:

   ```bash
   git -C <submodule> push -u origin <branch>
   git push -u origin <branch>
   ```

   The pre-push hook (`<lint-cmd>` + affected `<test-cmd>` + coverage) runs
   here. If it fails: append the output to `04-review.md` under
   `### Critical` as "Pre-push hook failed", set the verdict to
   CHANGES-REQUESTED, skip PR creation, enter the fix loop. Never bypass the
   hook.

2. **Open the PR** (first cycle only) into `BASE_BRANCH`, title and the
   pr-description-format body from `04-review.md` -> `## PR` verbatim.
   - **GitHub:** `gh pr create --base <BASE_BRANCH> --title "<title>" --body-file <file> --reviewer <a>,<b>`.
   - **Bitbucket:** the git-host MCP's create-pull-request call; set the
     workspace first, and treat "Resource not found" as stale workspace
     context (set it and retry once).
   - Reviewers: the team roster minus the runner; hosts reject
     author-as-reviewer. On a reviewer-list error retry once without
     reviewers, then tell the user to add them. If every route fails, paste
     the title and body into the final message and continue.
   - Record `PR: <url>` in `04-review.md` and `00-state.md`.
3. **Post the review**: the `## Verdict comment` block as one comment, then
   one comment per `## Inline comments` entry, anchored to its file and line
   (`gh pr review --comment`, `gh api .../pulls/<n>/comments`, or the host
   MCP). On a fix cycle post the `(fix cycle N)` blocks on the same PR.
4. **Screenshots** the developer saved outside the repo cannot be uploaded by
   you; say where they are and that the human attaches them.
5. Then the "REVIEW returned" row below.

## 4. Tracker status sync (automatic; never ask)

| Event                                              | Status                           | Also                                                                                      |
| -------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| Run pickup                                         | In Progress                      | assignee = runner if unassigned                                                           |
| REVIEW returned and the PR is open (any verdict)   | In Review (your equivalent)      | one comment: PR link, verdict, test and coverage numbers, what the human still owes (screenshots, reviewers, deployed-environment checks) |
| Halted run (failed stage, exhausted fix loop, user stop) | unchanged                   | one comment: what stopped and where the handovers are                                     |

Never transition to Done, Ready to Release, or QA states. Merging and
sign-off are human calls; a merged PR closes the loop by hand.

Mechanics: discover the available transitions (**Jira:**
`getTransitionsForJiraIssue`) and match the target name case-insensitively.
Never hard-code transition ids. All sync is best-effort: log failures to
`00-state.md`, never block a stage on the tracker.

## Adapt

- Status names: In Progress / In Review, or your workflow's equivalents.
- Reviewer roster: a short list in this file, or a team handle the host
  expands.
- PR creation route: keep the `gh` or the host-MCP line.
- **Jenkins:** if the PR body carries a CI link, encode `/` in the branch
  name as `%252F` (`feature/PROJ-123-x` -> `feature%252FPROJ-123-x`).
