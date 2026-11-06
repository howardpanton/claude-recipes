# Browser QA: traps and negative results

Companion to [SKILL.md](SKILL.md). Every entry was observed in a real run, not theorised.
Read the second half before recording any claim of absence.

## Traps that produce confident wrong answers

**Paginated scrapes silently re-read.** A loop that clicks "next" without waiting for the
paginator label to change re-reads the same page, and the duplicates get reported
confidently. Always assert the extracted row count against the paginator total
(`1 - 20 of N`). If they disagree, the extraction is wrong, not the application.

**A healthy API does not mean a working UI.** Successful fetches and zero console errors
can be recorded while the dialog never populates. Read the rendered state.

**Empty can mean broken.** Zero rows may mean no records, an unresolvable endpoint, or a
swallowed error. They render identically.

**The same empty state can mean two things.** One "nothing here yet" message meant *no
data* on one environment and *the panel is flagged off* on another. An empty state is
evidence of rendering, not of cause.

**The UI may disagree with the API.** The API count and the rendered count can differ by a
few rows. When a count matters, check both and record both.

**Results are tenant-scoped.** A result without a recorded tenant cannot be reproduced.

**The DOM is not the view.** A node present in the DOM may be invisible: check `display`,
the bounding box and `offsetParent`. Conversely, absence of a marker attribute does not
prove absence of behaviour: a page with zero tracking attributes can still emit analytics
through direct service calls. Only runtime proves a negative.

**Your session state is part of the harness.** Filters, sort order and view state set
during an earlier sweep persist across navigation and fake "no data to display".

**The visible chart may not include the range you care about.** Dead ends are often
resolved instantly by taking a screenshot: a chart scrolled away from the relevant range,
or a confirmation field nobody had noticed. Several blind probes cost more than one image.

## Before you believe a negative result

Absence is the most expensive claim in QA. "It does not fire", "it never renders", "there
are no events": each has been wrong, and each looked identical to the truth. Run this
list before recording any of them.

1. **Run a control.** Before reporting that a surface emits nothing, fire something you
   know does emit, in the same page context, immediately afterwards. A dead hook and a
   silent page are indistinguishable. One extra call.
2. **Verify your input is valid.** An unrecognised value falls through to a default and
   looks exactly like a regression. Feeding a state machine `IN_REVIEW` when the enum is
   `IN-REVIEW` produced output identical to a broken fix. Test a value the system
   recognises before believing a failure.
3. **Check your own harness is not the cause.** Clear every filter and view state you set.
4. **A timeout is not a frozen page.** Script-evaluation timeouts usually completed their
   work; only the response was late. Confirm with a trivial `1+1`, then read the resulting
   DOM. An apparent "one second per keystroke" usually evaporates on remeasure.
5. **Confirm you have the right fixture.** "This region never renders" was a fixture
   failure dressed as a product finding; it rendered fine on a record with the right
   configuration attached.
6. **An inert control may have an unmet requirement.** A disabled control and a missed
   click look identical: read `disabled`, `aria-disabled` and the class list first. A
   control that accepts the click but does nothing may be waiting on something, such as a
   confirmation field that needs the record's exact name typed in.
7. **Absent is not false.** A flag missing from the flag file and a flag set to `false` are
   different environments. An AC that says "when the flag exists..." is not exercised by
   an absent flag. Read the file with `{cache: 'no-store'}` and record the literal value.
