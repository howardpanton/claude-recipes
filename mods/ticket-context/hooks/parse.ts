// Pure helpers: what the branch name and the remote URL say. No engine calls.

// The ticket-tracker project keys that count as tickets in a branch name.
export const JIRA_PROJECTS = ["PROJ"];

export type Remote = {
  host: "bitbucket" | "github" | "other";
  owner: string;
  repo: string;
};

// `feature/PROJ-123-x` and `proj-456/x` both count; `sprint-2030-01` does
// not, because only the listed project prefixes are keys.
export function jiraKey(
  branch: string,
  projects: readonly string[] = JIRA_PROJECTS,
): string | null {
  const m = new RegExp(
    `(?:^|[^a-z0-9])((?:${projects.join("|")})-\\d+)(?![0-9])`,
    "i",
  ).exec(branch);
  return m ? m[1]!.toUpperCase() : null;
}

// `123-fix-x`, `fix/123-x`, `issue-123`, `fix/#123`. A bare number only counts at a
// path or word edge, so `release/2026-01-15` yields nothing.
export function githubIssue(branch: string): string | null {
  const m = /(?:^|\/)(?:issue-?|#)?(\d{1,6})(?:-(?!\d)|$)/i.exec(branch);
  return m && Number(m[1]) < 100000 ? m[1]! : null;
}

export function parseRemote(url: string): Remote | null {
  const m =
    /^(?:git@|ssh:\/\/git@|https?:\/\/(?:[^@/]+@)?)([^:/]+)[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(
      url.trim(),
    );
  if (!m) return null;
  const host =
    m[1] === "bitbucket.org"
      ? "bitbucket"
      : m[1] === "github.com"
        ? "github"
        : "other";
  return { host, owner: m[2]!, repo: m[3]! };
}

export const shorten = (s: string, n: number): string =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

// Output of `git rev-parse --path-format=absolute --show-toplevel --git-dir --git-common-dir`.
// A linked worktree keeps its git dir under the common one; the main checkout and a
// submodule have the two equal. Returns the worktree's top level, or null.
export function linkedWorktree(revParse: string | null): string | null {
  const [top, gitDir, commonDir] = (revParse ?? "").split("\n");
  return top && gitDir && commonDir && gitDir !== commonDir ? top : null;
}

export const tildify = (path: string): string =>
  path.replace(/^\/(?:Users|home)\/[^/]+/, "~");
