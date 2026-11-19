# Chat message templates

Plain text in your chat tool's markup. `<KEY>` is rendered as a link to the ticket,
`<ticket-url>` with the key as its label. The first message per ticket is top-level;
everything after goes in its thread.

**assessing** (top-level)
> Assessing <KEY>: _<summary>_. Checking it is still relevant and that it has a clear outcome, repro steps, acceptance criteria and business value.

**updated** (thread)
> Updated <KEY> in the tracker. Changed: <one line per change, e.g. "added GIVEN/WHEN/THEN criteria", "added repro steps from the component">. Verdict: <Ready | Needs work>.

**starting** (thread)
> Starting work on <KEY>: worktree off `<train>`, running the ticket pipeline unattended. Will post here when a PR is up. <If the train is behind: note "merge-back owed".>

**pr-ready** (thread)
> <KEY> is ready for PR review: <PR URL>. Review verdict: <verdict>. Coverage: <statements/branches/functions/lines>. E2E: <per-domain counts | none (reason)>. Browser evidence: <posted | owed (reason)>.

**needs-clarity** (thread, mentions the channel)
> <channel mention> <KEY> needs clarity before I can build it:
> 1. <question>
> 2. <question>
> Answer on the ticket and remove the `ai-needs-clarity` label; I will pick it up on the next sweep.

**needs-human** (top-level)
> <KEY>: _<summary>_ is not an application-code bug (<reason: pipeline, infrastructure, design scope>), so it is outside the automated pipeline. Labelled `ai-needs-human`.

**stale** (top-level)
> <KEY>: _<summary>_ looks already fixed or obsolete: <evidence>. Commented on the ticket and labelled `ai-stale`; please close it, or remove the label if I am wrong.

**halted** (thread)
> <KEY> stopped at <stage>: <reason>. Handovers in `<handover-dir>/<KEY>/`. Needs a human look.

**closed** (thread)
> <KEY> PR <PR URL> was <merged|declined>. Worktree `<path>` can be removed. <If merged: it rides `<train>`; merging the train back is the release owner's step.>
