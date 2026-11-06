# Coding guidelines (repo-specific)

- Prefer shared building blocks in `libs/shared/*` (especially `libs/shared/ui`) over duplicating UI.
- Keep business logic in services / data-access; keep components thin.
- Prefer RxJS Observables for non-trivial async flows; Signals only for simple local state.

## Angular best practices

- Keep templates simple: move non-trivial logic into component methods or services.
- Prefer `protected` for members read by templates (don't mark template-used fields `private`).
- Keep lifecycle hooks small and focused; extract helpers or services when they grow.
- Prefer constructor injection or `inject()`; follow the local pattern in the file.
- Prefer `[class.foo]` / `[style.width.px]` bindings for simple cases; use `ngClass` / `ngStyle` only for dynamic sets.

## TypeScript correctness

- Always specify function and method return types (including `private` / `protected` helpers).
- Avoid `any`; prefer concrete types, generics, or `unknown` plus narrowing.
- Prefer typed options objects over long positional parameter lists.
- Use primitive types (`string`, `number`, `boolean`), not boxed types (`String`, `Number`, `Boolean`).
- Prefer `?` optional fields and params over unions like `T | undefined` when the value is simply optional.
- Avoid non-null assertions (`!`) and broad type assertions (`as SomeType`) unless there is a clear reason.
- In `catch`, prefer `catch (e: unknown)` and narrow (`e instanceof Error`) before using.

## Naming

- Use descriptive names for parameters and locals (no single letters except trivial loop indices).
- Use intention-revealing names for booleans (`isLoading`, `hasAccess`).

## RxJS / async

- Prefer returning `Observable` from services; avoid subscribing inside services unless the side effect is the point.
- Prefer operator pipelines (`source$.pipe(...)`) over nested subscribes.
- In components and directives, prefer `takeUntilDestroyed()` for subscription cleanup.

## Style

- Match existing formatting: 2-space indentation, single quotes. The formatter runs on write; don't hand-format.
- Avoid large, mixed-responsibility files; split by feature or service when things grow.

## Safer TypeScript patterns

- Use modules (ES imports/exports); don't introduce TypeScript `namespace`.
- Prefer `const` by default; use `let` only when reassignment is required.
- Prefer object and array literals over `new Object()` / `new Array()`.

## Shell vs feature-app responsibility

- `src/` is the container / shell: routing plus shared state. Feature behaviour belongs in the feature apps under `apps/*`.
- When adding routes to the shell, follow the existing lazy-loading pattern in the shell's routing file.
- Import feature apps and shared libs through their `index.ts` barrel (the `@scope/*` alias), never by deep path. A barrel is the public API; a deep import is a hidden dependency that breaks on the next refactor.
