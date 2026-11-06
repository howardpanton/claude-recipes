# UX design: reference tables

Companion to [SKILL.md](SKILL.md). The full state inventory, interaction rules, copy
patterns and the PR review gate.

## Mandatory states

Each needs a designed treatment or an explicit "not applicable, because".

| State | Covers | Treatment |
| --- | --- | --- |
| Loading | First load, re-fetch, slow API | Skeleton or spinner in place; no layout shift |
| Empty, first use | Nothing exists yet | Why it is empty + the one action that fills it |
| Empty, filtered | Filters or search match nothing | "No results for <filter>" + clear-filters action |
| Partial or stale | Page 1 of N arrived, poll gap, old data shown after a failed fetch | Visible freshness ("Updated 10 s ago"); the stale threshold is a proposed default needing product sign-off |
| Error | Fetch or submit failed | Cause + action; status code in parentheses after the human message |
| Disabled or locked | Guard not unlocked; capability off | Control visible, disabled, reason in tooltip |
| Permission denied | User lacks the permission | Hidden or disabled per the sibling screen's pattern; never a dead button |
| Validation | Missing, malformed, out of range | Inline, on the field, before submit |
| Pending vs confirmed | Submitted, not yet applied | Pending shown immediately; confirmed only on the API response |
| Not found | Deleted or wrong id | A named state, never a silent spinner |

Rules: one level per element (Error, Warning or Neutral), never two at once; icons only on
Errors, Neutral is text only, dimmed is always Neutral; co-existing states are listed
explicitly, not discovered in review; all terminal states share one look; messages map
one-to-one onto the matrix, and two states the UI cannot tell apart get one merged
message, not a guess.

Worked example, a batch-export job tile (lifecycle x output):

| Lifecycle | Output absent | Output present | Not found |
| --- | --- | --- | --- |
| Queued | Neutral "Waiting to start" | Neutral | Neutral "Export not found" |
| Running | **Error** "No destination folder set for this export; check its settings" | Neutral | Neutral |
| Finished | **Error** (same message) | Neutral "Finished" | Neutral |

## Interaction rules

| Rule | Why |
| --- | --- |
| An input shows the next action, never the current state: empty on load, not pre-populated after submit | Operators fire the same control repeatedly; stale values get re-sent |
| Show what the app submitted and its status; never claim what a downstream system is doing | The UI cannot see the other end |
| Clear acts on the thing, not on the typed value; the value stays | Clearing is not undo |
| Destructive actions confirm with the resource named and the consequence stated; typed confirmation only for irreversible production impact | Mistakes under time pressure are expensive |
| Pending shows immediately; success only on the API response | Optimistic success lies during an outage |
| Disabled controls stay visible with a tooltip reason; locked pages use the guard pattern | Hidden controls read as missing features |
| System constraints never reach the user: no region pickers, bucket names or status codes as the primary message | The person doing the job should not manage the plumbing |
| Multi-select across pages selects the visible page unless the user chooses "all N" | Header select-all selecting the whole tenant is a live bug class |
| Long or dynamic strings truncate with a tooltip; controls never resize to fit content | Layout stability |
| Every action is keyboard-reachable; focus returns to the trigger when a dialog closes | `accessibility` |
| Freshness is visible on polled data | Operators act on what they see |

## Copy patterns

| Pattern | Shape | Example |
| --- | --- | --- |
| Empty, first use | What is missing + action | "No exports yet. Create an export to see it here." |
| Empty, filtered | Scope + reset | "No invoices match these filters." + Clear filters |
| Error, recoverable | What failed + what to do | "Couldn't load invoices. Retry, or check the account's permissions." |
| Error, needs support | What failed + where to go | "Preview is not available; check the record's configuration (403)" |
| Confirm destructive | Resource + consequence | "Delete connection primary-1? Its subscribers stop receiving updates." |
| Pending | What was sent | "Publish sent; waiting for confirmation" |
| Success | What is now true | "Report published" |

## PR review gate

For any human or agent review of a user-facing diff. Findings are Major;
colour-alone, contrast and missing accessible names stay Critical under `accessibility`.

| Check | Where to look |
| --- | --- |
| Every mandatory state the change touches is implemented: loading, empty, error, disabled, pending | Template branches; specs covering each |
| New strings follow the copy rules and exist in every locale file | `grep -l '<KEY>' src/assets/i18n/*.json` returns one file per locale |
| The same action uses the same component and verb as its sibling screen | Diff vs the named prior-art component |
| Dialogs return focus; new controls are keyboard-reachable | Manual tab-through |
| No new surface where a shared component fits | Diff vs `ls libs/shared/ui/src/lib` |
| Implementation matches the linked design's states and copy; deviations named in the PR | The design brief, the PR description |
| Polled or submitted data shows freshness or pending status | Template |

## Evidence

| Counts | Does not count |
| --- | --- |
| A screenshot of each designed state from the mock server | One happy-path screenshot |
| Analytics events for usage questions | "Users will love it" |
| User or product feedback captured as ticket comments or follow-up tickets | Feedback relayed verbally |
| Before/after interaction count for the common path | "Feels faster" |
