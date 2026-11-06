# Estimation rubric: human effort and risk, not code size

Used by `write-ticket` step 5. Points measure how much human attention a
ticket needs when an agent does most of the typing; a large diff that is
obvious and low-risk is cheap, a ten-line change to a shared library is not.

Score each dimension 1-3, add them, convert.

| Dimension                        | 1                                         | 2                                                             | 3                                                                        |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Clarity: effort to make it ready | ACs clear, a pattern exists, context is in the repo | Some unknowns; needs a design or API-contract check | New area, unclear requirements; needs a spike or product/UX input        |
| Verification: effort to prove it | Small diff, existing tests, no manual QA  | Several components or one package; new tests; manual check on one product | Spans packages or the pipeline; visual QA, a real build, or customer sign-off |
| Risk: impact if wrong            | Internal or behind a flag; easy rollback  | Visible to users of one product                               | Shared libs, release pipeline, customer data, live customer workflows    |

| Total | Points | Rule                                       |
| ----- | ------ | ------------------------------------------ |
| 3     | 1      |                                            |
| 4     | 2      |                                            |
| 5-6   | 3      |                                            |
| 7-8   | 5      | Confirm scope before pulling into a sprint |
| 9     | 8      | Split, or run a spike first                |

## Rules

- Estimate assuming an agent does the typing. Never lower points afterwards
  because it was fast; the human effort was the same.
- Dev Ready only when Clarity is 1 or 2. Clarity 3 means the first AC is
  "agree X with Y before development", or the ticket becomes a Spike.
- Pipeline and CI work nearly always scores Verification 3 and Risk 3, so 5
  points is its floor.
- Until your tracker has fields for the three scores, record them in a
  comment, not the description:
  `Estimate: Clarity 2, Verification 2, Risk 2 = 6 -> 3 pts. <one line why>`.
- Keep three reference tickets from your own backlog (one each at 1, 3 and 5
  points) and name them here, so new estimates are calibrated against
  something real.
