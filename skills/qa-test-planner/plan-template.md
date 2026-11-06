# <Team> - Regression Test Plan v1 - <sprint> [<fix version>] (<environments>)

Links: release report · previous cycle's plan · `browser-qa` recipe (executes this plan)

## 1. Release content and risk profile

- Fix version `<id>`: `<N>` issues (`<n>` tasks, `<n>` stories, `<n>` bugs).
  Keys: `PROJ-123, PROJ-124, ...` (the executor diffs the live query against this list)
- Release candidate build: `<identifier>`
- Backend snapshot, test environment vs production:

| Service / module | Test env | Production | Checks affected |
| --- | --- | --- | --- |
|  |  |  |  |

- Risk clusters (marquee / refactor / resilience / UI / cross-cutting), one line each
- Programme-level questions (what several tickets exist to enable, phrased as a question)
- Issues with no check and why: ...

## 2. Framework and conventions

- Every result records the build string of the environment it ran on; results against a
  superseded build do not count.
- Timestamps: 24-hour local time with timezone, never inferred from a filename.
- Destructive-action rule: never batch-delete or modify shared fixtures; disposable,
  uniquely named data only; the executor records destructive actions taken, including
  "None". Records with lifecycles are created future-dated.
- Privacy: record request parameters and payload keys, never payloads with PII.
- Soft-delete wording: "deletion" may transition a record rather than remove the row.
- Every result names the tenant and the literal flag values that mattered.

## 3. Entry criteria

| Item | Kind (account / access / fixture / flag) | Status (confirmed / needed) | Where it lives | Needed by |
| --- | --- | --- | --- | --- |
| Privileged user |  |  |  |  |
| Unprivileged user |  |  |  |  |
| `<flag>` = `true` / `false` / absent |  |  |  | RT-xx |
| `<data fixture>` |  |  |  | RT-xx |

## 4. Checks

| ID | Env | Test and expected result | Refs |
| --- | --- | --- | --- |
| RT-01 | all used | Entry verification: footer build string equals `<identifier>`; flag file shows the literal values in section 3 | - |
| RT-02 | primary | ... Expected: ... (instrument: ...) | PROJ-123 |
| RT-NN | primary | Cross-surface smoke: open each main surface, no console errors, data renders | - |

## 5. Environment split rationale

| Check | Env | Reason it is not on the primary environment |
| --- | --- | --- |

## 6. Exit criteria

| Gating cluster | Passed requires (specific evidence) | Blocked when | At-risk items / owner |
| --- | --- | --- | --- |

Non-gating checks are recorded alongside, not omitted. Findings harmless now and unfixable
later are listed here as sequencing decisions.

## 7. Evidence and sign-off

Sign-off by: ... Date: ... Corrections to this plan are struck through in place with a
dated note appended below; nothing is silently edited.

## 8. Execution evidence

(Left empty for the executor. One block per check: build string, timestamp, tenant, flag
values, verdict, destructive actions, evidence, ticket raised if any.)
