# ci-watch

Status line and `/ci` pane for the CI jobs you watch while working: the latest build of each
job (number, result, age, duration), the `input()` gate a running build is paused on, a toast
when a build finishes or starts waiting for approval, and a warning when a deploy job ends
ABORTED.

**Jenkins-flavoured.** It polls `lastBuild/api/json` (Jenkins REST) and
`wfapi/pendingInputActions` (Pipeline Stage View) over `curl -n`, so the API token lives in
`~/.netrc`, never in the mod. For GitHub Actions or another CI, replace `fetchRun` and keep
the rest.

## Config (top of `hooks/register.tsx`)

| Constant | Meaning |
| --- | --- |
| `HOST` | Jenkins base URL |
| `JOBS` | `{ label, path }` per job; `path` is the URL path under `HOST` (`job/<folder>/job/<name>/job/<branch>`) |
| `DEPLOY_LABELS` | labels whose ABORTED result gets the "may still have deployed" warning |
| `EVERY_MS` | poll interval |
| `CURL` | the curl invocation; `-n` reads `~/.netrc` (`machine <host> login <user> password <api-token>`) |

## Why the ABORTED warning

Learned the hard way: an abort that lands during a deploy job's prepare stage can be
swallowed by the pipeline, which then runs its apply step anyway. ABORTED on a deploy job
means "open the console and check the apply step", never "nothing happened".
