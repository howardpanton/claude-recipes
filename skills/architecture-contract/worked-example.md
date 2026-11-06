# Architecture contract: worked example (neutral names)

Four rows in the shape the skill prescribes: one decision, two invariants, one weak point
with its "do not fix casually" entry. Copy the shape, replace the facts.

## D3: `DataService<T>` is the universal API service

`libs/shared/data-access` provides HTTP CRUD, loading state (`INITIAL | LOADING | LOADED |
ERROR`) and an optional session-storage cache in one base class.

*Why it is this way:* one place for the cross-cutting behaviour every API service needs.

*Consequence you must respect:* every new API service extends it and overrides both
serialisers (`toModel`, `toApi`); the base implementations throw, at runtime, the first time
the cache calls them. Never invent a parallel pattern.

- Re-verify: `grep -n 'not implemented' libs/shared/data-access/src/lib/data.service.ts`

## I1: the app-initializer chain is ordered and awaited

`src/app/app.module.ts` registers, in provider order: error reporting -> auth config ->
feature flags -> translations. The framework awaits every initializer before the first route
resolves, but not before code that runs *during* initialisation.

- **Never** call `isFeatureEnabled()` in a constructor or field initialiser of a root
  service: it can run before the flag file loads and silently returns `false`. Check flags in
  guards, resolvers or `ngOnInit`.
- **Never** reorder or remove an initializer without checking what depends on it (auth config
  before anything that makes an authenticated call; flags before any flag-gated route renders).
- Re-verify: `grep -n 'APP_INITIALIZER' src/app/app.module.ts`

## I2: session storage is the tenancy context bus

The keys `activeTenant`, `userState` and `permissions` are read raw, at call time, by the URL
resolver, the auth guard and every lazily loaded app. They survive a reload and need no
dependency-injection link between the shell and the apps, which is why they exist; it is also
why changing a key name or shape is a platform-wide breaking change.

- **Never** rename, restructure or write non-JSON values to these keys.
- **Never** call a tenant-scoped endpoint before the keys exist (before the tenant switch has
  completed): the URL is built from `null` and the call fails only in production, where the
  resolver has no null guard.
- **Never** add a tenant-scoped, session-cached service without adding its reset to both the
  tenant-switch handler and the logout cleanup. Miss it and users see the previous tenant's
  data: a cross-tenant leak, not a stale-UI bug.
- Re-verify: `grep -rn "'userState'" src libs apps --include='*.ts'` and
  `grep -n '<reset-fn>' src/app/app.component.ts src/app/<cleanup-file>` (example names:
  `resetStateData`, `app-cleanup.ts`)

## W6: RxJS is pinned with a package-manager patch

`package.json` pins `rxjs` to one version and a `resolutions` entry applies
`.yarn/patches/rxjs-*.patch`.

FACTUAL TRAP, not doctrine: removing the patch broke the CI image build and was reverted in the
same ticket; a patch that no longer applies fails install outright. There is no documented
upgrade path.

| Do NOT casually... | Maps to | Because |
| --- | --- | --- |
| Upgrade or unpin RxJS, or touch `.yarn/patches/rxjs-*` | W6 | the patch removal broke CI and was reverted; install fails if the patch does not apply. Needs its own ticket, a CI run on a branch and a rollback story |

- Re-verify: `grep -n '"rxjs"' package.json && ls .yarn/patches/`
