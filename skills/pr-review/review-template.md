# PR review output template

Lead with submodule and ownership impact, then the gates, then findings by
severity. Every finding gets `path:line` and a concrete fix.

```
## PR Review

**Range:** <branch> -> <integration-branch>  (<N> files, +X/-Y)
**Verdict:** APPROVE / APPROVE-WITH-NITS / CHANGES-REQUESTED

### Submodule & ownership impact
- Pointer bumps: <submodule -> old..new, what it pulls in | none>
- Cross-repo ripple: <each repo a merger must land, in order | self-contained>
- Unmerged-pointer / barrel-break risks: <... | none>

### 🔴 Critical (must fix before merge)
**[Category]** `path:line` - issue + concrete fix.

### 🟠 Major (should fix)

### 🟡 Minor (consider)

### Gates
- Sibling specs / lint / coverage: <ok | what fails>
- Conventions: <ok | deviations>
- Skill drift: <none | skill that must be updated in this PR>

### Security
<clean | findings>

### Strengths

### Recommended actions (ordered)
1. ...
```
