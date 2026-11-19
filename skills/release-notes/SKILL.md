---
name: release-notes
description: Use when asked to write, draft, generate or publish customer-facing release notes, "what's new" notes or in-product release notes for a release or fix version. Covers reading the release's tickets, keeping only what a customer would notice, writing entries into the in-app notes file, running the editorial gate, and opening a sign-off PR for product approval.
---

# Release notes (customer-facing)

## Overview

Turns one **fix version** into dated items in `<notes-file>`, the data file the
application's "What's new" panel and history page render. The only human step is the
product owner approving the PR this recipe opens, so everything written must already be
safe to show a customer. Internal release notes (the engineering changelog, the release
report) are a different artifact and are not touched here.

## When to use

- A release is about to ship and its customer-facing notes are not written.
- Asked to draft or publish "what's new" for a named release.

Not for internal changelogs, for announcing anywhere outside the notes file, or for
merging: the PR is the deliverable.

## Inputs

| Thing | Value |
| --- | --- |
| Ticket project | one project only (`PROJ`) |
| Output file | `<notes-file>`, a flat list of items, newest first |
| Gate | `<notes-gate-cmd>`, the content spec for that file |
| PR target | the release branch for this release if one exists, otherwise `<integration-branch>` |

## Procedure

### 1. Resolve the fix version

The user names it. The query needs the exact name; confirm it before querying.

### 2. Read the issues

**Jira:** `project = PROJ AND fixVersion = "<exact name>" AND statusCategory = Done AND
issuetype in (Story, Bug, Task) ORDER BY key`, fetching summary, type, components, labels
and description. **GitHub:** the closed issues in the milestone. Results are often capped
per call: paginate by key until exhausted. Zero issues means a misspelled name; stop and
say so.

### 3. Select what a customer would notice

Keep an issue only if a user can **see or do something new** because of it. Drop,
without exception:

- Tasks that are configuration, flag enablement, allowlists, CI, tooling, upgrades,
  refactors, test-only or documentation work.
- Bugs whose summary describes a failure state (spinner, crash, hang, 4xx, timeout).
  Customers are told what now works, never what was broken.
- Anything referencing an incident, an operations ticket or a named customer.
- Cosmetic fixes too small to describe in one plain sentence.

No customer-visible change: stop, report "nothing to publish", and record that outcome
as a comment on the release's tracking ticket, naming the issues considered. Do not open
an empty PR. The decision must be visible even when nothing ships.

### 4. Write the items

Add one item per feature at the **top** of the array, all dated with the release date.
New features before improvements within the same date.

```json
{
  "id": "<release date>-<kebab-slug>",
  "date": "<YYYY-MM-DD>",
  "area": "<one of the allowed areas>",
  "type": "new-feature | improvement",
  "title": "<8 words at most, the feature as a customer names it>",
  "text": "<one sentence, 40 words at most, always shown>",
  "details": ["<optional; one bullet per user-visible capability, 40 words at most>"],
  "link": "<optional; an in-app path such as /orders, or an https URL to a video or docs page>",
  "demoUntil": "<required when link carries ?demo=; YYYY-MM-DD, at most two months after date>",
  "permission": "<optional; the permission the feature's page requires>",
  "featureFlag": "<optional; the flag key when the feature is gated>"
}
```

- **One item per feature, not per ticket.** A feature spanning several tickets (list,
  detail, export) is one item: `text` is the one-line summary, `details` carries the
  per-surface bullets. Never paste a ticket summary or description; rewrite from scratch.
- **Links, case by case.** Set `link` only when the ticket names a demo. An in-app path
  renders as "Try it"; an https URL opens in a new tab. No screenshots are shipped; where
  a picture would help, link to the feature itself.
- **Guided tours, rarely.** An in-app link may carry `?demo=<key>`, which starts the
  tour registered under that key: a few highlighted steps over the real page. Only for a
  feature the product owner explicitly wants to promote; most items get no link or a
  plain one.
- **Tours are time-limited.** A tour silently rots as the page it walks changes, so
  every `?demo=` link carries `demoUntil`. After that day the application drops the
  parameter itself: the link still opens the page, without the tour, and nothing needs
  redeploying. The application also refuses to start a tour when a step target is
  missing, so a changed page ends the tour rather than breaking it halfway. When a tour
  expires or its feature changes, delete its registration and the parameter in the next
  notes PR.
- **Permissions, by default.** Set `permission` from the item's area so users who cannot
  reach the feature never hear about it. Keep an area-to-permission table beside this
  recipe; where the area has no fixed permission, look up what the page's guard checks.
  Areas everyone can reach take none.
- **History is never pruned.** Old items stay in the file; the panel surfaces only the
  newest few and the history page lists everything.

### 5. Style guide

- Present tense, second person where natural: "You can now...", "Orders show...".
- Say what the user can do, not what the team did. "Reorder a saved basket in one click"
  beats "Added reorder support".
- Plain product vocabulary only: a technical term appears only if the UI itself shows
  it. No API, endpoint, flag, allowlist, backend, sprint, framework name, PR or ticket
  key.
- No blame vocabulary, in `text` or `details`: bug, hotfix, incident, regression, crash,
  outage, broken, workaround. "Lists show a loading state until data arrives" is fine;
  "fixed a bug where tables showed no data" is not.
- One idea per item. If it needs a "however", split it or drop it.
- A heads-up, not a sales message: tell users what to look out for so no visual change
  surprises them. No superlatives, no "we're excited".

### 6. Run the gate, fix until green

Run `<notes-gate-cmd>`. The content spec should reject ticket keys, blocked words,
unknown areas or types, over-long text or bullets, duplicate ids, unsorted dates,
malformed links, malformed permission strings, and a `?demo=` link without a valid
`demoUntil`. Rewrite the entry, never the spec, unless a new area is being added
deliberately.

### 7. Open the sign-off PR

Branch `feature/whats-new-<release date>` from the PR target. Commit as
`docs(no-release): customer notes for <release name>` if documentation commits would
otherwise cut a release (see `change-control`). PR title `Customer release notes -
<release name>`. Body: the new items rendered as Markdown (date, then `**Area | Type** -
title: text` per item, bullets beneath) plus the gate output. Reviewer: the product
owner. Do not merge. Report the PR URL and the rendered notes back to the user.

## Gotchas

- The notes file ships inside the build, so the notes describe exactly the code that is
  deployed. Target the release branch so the entry rides with the changes it describes.
- Items are global. Differences between tenants or plans are expressed only through
  `featureFlag` and `permission` on individual items.
- One language only, unless the file format already carries translations.
- A notes PR opened against `<integration-branch>` when a release branch exists
  announces the feature one release late.

## Adapt to your repo

- `<notes-file>`: path and exact item schema; delete the fields your panel does not
  render (`demoUntil`, `permission`, `featureFlag`).
- `<notes-gate-cmd>`: the test command for the content spec. If you have no such spec,
  write it first; the blocked-word list in the style guide is its starting point.
- Allowed `area` values and the area-to-permission table.
- `<ticket-tracker>`: project key, fix-version or milestone query, and the release
  tracking ticket where a "nothing to publish" outcome is recorded.
- `<integration-branch>` and your release-branch naming.
- Who approves: replace "product owner" with the reviewing role.
- Tour registration: where demo keys are registered, the allowed key format, and the
  maximum `demoUntil` window.
