# Browser QA: instruments

Companion to [SKILL.md](SKILL.md). The mechanics behind the evidence techniques.

## Capturing network evidence: arm first, act second

`read_network_requests` reports only traffic captured while tracking was active, so
calling it after the action returns nothing. `performance.getEntriesByType('resource')`
is often empty because SPA navigation clears the buffer, and a 404 leaves no
resource-timing entry at all, so absence there proves nothing.

Install an `XMLHttpRequest` / `fetch` wrapper before triggering the action. It yields
response bodies, which the network tool does not. Record request parameters and payload
keys, never values containing PII.

## Instrumenting page-entry events

Events that fire during page entry (analytics `*_viewed`, init events, anything emitted on
load) are invisible to a hook installed on an already-loaded page.

- Install hooks first, then navigate in-app so they survive:
  `history.pushState({}, '', path)` then
  `window.dispatchEvent(new PopStateEvent('popstate', {state: {}}))`.
  A full `navigate` reloads the page and destroys injected hooks.
- Wrap more than one sink. Events were captured only once both `window.gtag` and
  `dataLayer.push` were wrapped; on one environment every event arrived via `gtag`, so a
  `dataLayer`-only hook reported total silence on a page that worked.

## Rewriting responses to drive client-side states

Many checks get recorded as fixture-blocked when the behaviour under test is derived
client-side. If the component computes its output from a payload, the deployed component
can be driven by rewriting that payload's response. One cycle closed every AC of a
status-mapping ticket this way, against the real build, without the lifecycle fixture the
plan demanded existing anywhere.

Wrap `XMLHttpRequest`, mutate the parsed body at `readyState === 4`, and redefine
`responseText` / `response` on the instance. A listener added inside a wrapped `send()`
still fires before the `load` handlers the HTTP client registers, so the mutation lands
first.

Rules that make this evidence rather than a trick:

- Responses only, never requests. Nothing is written to any API.
- Count the rewrites and return the counter with every probe, so a silent no-op cannot be
  mistaken for a pass.
- Disarm and verify: clear the flags, re-enter, confirm zero rewrites and live values.
- State what it proves: the client-side mapping, where this class of defect lives, not
  that the backend emits those payloads.
- Check the enum spelling against a known-good value first (traps.md, item 2).

## The success/failure pair

An AC of the form "fires on success, not on button click" is not tested by a passing
action, because a click-bound emitter looks identical. Test both sides:

1. Perform the action normally; confirm the event fires.
2. Block the write and force a failure: a scoped interceptor that fails non-`GET`
   requests to that endpoint with a 500. Confirm the event does not fire.

Verify the blocker with a dummy request before touching the UI. This doubles as the safe
way to exercise a destructive control on a shared environment: prefer a blocked write to a
real one wherever the question allows. Disarm afterwards and confirm with a `GET`.

## Validation fields

Validation state can lag one change behind: on some fields every verdict belongs to the
previous value, which makes a correct field look like a regression. Set each value three
times with a short wait, then read. Before trusting any field, run a reliability pass:
alternate a known-good and a known-bad value and confirm the verdicts alternate. Then run
the matrix twice, in opposite orders.

Test the validator, not the attribute. A `maxlength` attribute truncates input and makes a
length check meaningless. Set the value programmatically so the field genuinely holds the
over-length string, then read the validity state.

## Visual verdicts without persisted screenshots

Session screenshots cannot be attached to the plan. Back any visual verdict with
`javascript_tool` measurements: bounding boxes, `elementFromPoint`, overflow ratios
(`scrollWidth / clientWidth`). A verdict resting only on what was seen is Not exercised
until a human re-captures it.
