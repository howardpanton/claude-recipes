# Memory file template

Copy, fill, save as `<name>.md` in the memory directory, then add the index line to
`MEMORY.md`. One fact per file. Dates absolute (`YYYY-MM-DD`) or absent.

```markdown
---
name: <kebab-case; equals the filename stem>
description: "<one sentence a reader can act on without opening the file: the symptom or the rule; under 200 characters>"
metadata:
  type: feedback | project | reference
---

<The fact, one to five lines. For a trap: what you saw, then what it was. For state: what
is true as of <YYYY-MM-DD> and what is still owed. For a pointer: where it lives and the
command that reads it.>

**Why:** <the one line that justifies the rule: the class of incident, without the
incident's ticket, date, host or people>

**How to apply:** <what to do next time; a command or a check where one exists>

Related: [[other-memory-name]]
```

Index line, appended to `MEMORY.md`:

```markdown
- [<Short title>](<name>.md) — <hook, under 120 characters: the clause that decides whether to open it>
```

## Type guide

- `feedback`: a correction from a person. Without the **Why** it reads as arbitrary and gets
  re-broken.
- `project`: state the repo cannot tell you. Every claim carries an absolute date; rewrite
  (do not append) when it changes.
- `reference`: a pointer or a recipe that took real time to find. The value is the pointer.

## Correcting an existing memory

Put the correction first and the old belief second, so a reader meets the correction before
the trap:

```markdown
**CORRECTED <YYYY-MM-DD>:** <what is actually true>. The earlier claim below was wrong
because <reason>.
```

Delete the file instead when the old belief is not a trap anyone else will fall into.
