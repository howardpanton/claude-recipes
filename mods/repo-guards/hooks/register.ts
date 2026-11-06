import type { EngineInterface, McpToolName, Register } from "claude-code";

// ---------------------------------------------------------------------------
// Config: the only block to edit when adopting this mod.
// ---------------------------------------------------------------------------
// Guard 3. Files CI loads on a JVM that is not UTF-8 (Jenkins pipeline Groovy):
// ASCII only. Widen or replace for your CI.
const ASCII_ONLY_PATHS = /(\.groovy|(^|\/)Jenkinsfile[^/]*)$/;
// Guard 4. What the repo's pre-push hook prints when it found nothing to lint
// or test (so the push proved nothing).
const GATE_SKIPPED_TEXT = "No changes detected in branch diff";
// Guards 5 and 6. The git host's MCP tools. Bitbucket shown; for GitHub use
// "mcp__github__merge_pull_request", "mcp__github__create_pull_request" and
// DESTINATION_ARG "base".
const MERGE_PR_TOOL: McpToolName = "mcp__bitbucket__merge_pull_request";
const CREATE_PR_TOOL: McpToolName = "mcp__bitbucket__create_pull_request";
const DESTINATION_ARG = "destinationBranch";
// Guard 6. A "created" PR older than this was returned, not created.
const EXISTING_PR_MINUTES = 10;
// ---------------------------------------------------------------------------

type Engine = EngineInterface;

const unquote = (s: string): string => s.replace(/^(["'])(.*)\1$/, "$2");
const join = (base: string, p: string): string =>
  p.startsWith("/") ? p : `${base}/${p}`;
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

async function git(
  $: Engine,
  cwd: string,
  args: string[],
): Promise<{ ok: boolean; out: string }> {
  try {
    const r = await $.process.run(["git", ...args], { cwd });
    return { ok: r.exitCode === 0, out: r.stdout };
  } catch {
    return { ok: false, out: "" };
  }
}

// Where a Bash command's git runs: a leading `cd X &&`, then `git -C Y`, else the session cwd.
async function commandDir($: Engine, command: string): Promise<string> {
  const base = await $.session.cwd();
  const cd = /^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*&&/.exec(command)?.[1];
  const dashC = /\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(command)?.[1];
  const dir = cd ? join(base, unquote(cd)) : base;
  return dashC ? join(dir, unquote(dashC)) : dir;
}

// Guard 1. Gitlink SHAs. A hand-typed SHA with one wrong hex digit fails every CI
// build at checkout ("upload-pack: not our ref"), and nothing local notices
// because git happily records any 40 hex characters as a pointer.
const CACHEINFO =
  /--cacheinfo[=\s]+(?:160000,([0-9a-fA-F]+),([^\s;&|]+)|160000\s+([0-9a-fA-F]+)\s+([^\s;&|]+))/g;
const COMMIT = /\bgit\b(?:\s+-C\s+\S+)?\s+commit(?![-\w])/;

async function gitlinkProblem(
  $: Engine,
  base: string,
  path: string,
  sha: string,
): Promise<string | undefined> {
  const sub = join(base, path);
  if (!/^[0-9a-f]{40}$/i.test(sha))
    return `${path}: "${sha}" is not a full 40-character SHA.`;
  if (!(await $.fs.exists(`${sub}/.git`))) {
    return `${path} is not checked out here, so ${sha} cannot be verified. Run git submodule update --init ${path}, fetch it, then retry.`;
  }
  if (!(await git($, sub, ["cat-file", "-e", `${sha}^{commit}`])).ok) {
    return `${path}: commit ${sha} does not exist. Either it is a typo or it has not been fetched (git -C ${path} fetch origin, then retry). Capture gitlink SHAs with rev-parse or ls-remote; never type them.`;
  }
  const remote = await git($, sub, ["branch", "-r", "--contains", sha]);
  if (!remote.ok || !remote.out.trim()) {
    return `${path}: commit ${sha} is on no origin branch, so CI cannot fetch it. Push it first, or refresh remote refs (git -C ${path} fetch origin) and retry.`;
  }
  return undefined;
}

async function gitlinksProblem(
  $: Engine,
  dir: string,
  command: string,
): Promise<string | undefined> {
  // Literal SHAs only: a $(rev-parse ...) or $VAR SHA was captured, not typed.
  for (const m of command.matchAll(CACHEINFO)) {
    const problem = await gitlinkProblem(
      $,
      dir,
      unquote(m[2] ?? m[4] ?? ""),
      m[1] ?? m[3] ?? "",
    );
    if (problem) return problem;
  }
  if (!COMMIT.test(command)) return undefined;
  const top = await git($, dir, ["rev-parse", "--show-toplevel"]);
  if (!top.ok) return undefined;
  const staged = await git($, top.out.trim(), [
    "diff",
    "--cached",
    "--raw",
    "--no-abbrev",
    "--ignore-submodules=dirty",
  ]);
  for (const line of staged.out.split("\n")) {
    const m = /^:\d{6} 160000 [0-9a-f]+ ([0-9a-f]{40}) \w+\t(.+)$/.exec(line);
    const problem =
      m && (await gitlinkProblem($, top.out.trim(), m[2] ?? "", m[1] ?? ""));
    if (problem) return `Staged submodule pointer is bad. ${problem}`;
  }
  return undefined;
}

// Guard 2. Reverts that would discard uncommitted edits. A mutation-test loop
// that reverts with git checkout destroys the real, uncommitted change along
// with the mutation. Commit first; then mutate and revert against the commit.
const REVERT = /\bgit\b(?:\s+-C\s+\S+)?\s+(checkout|restore)\b([^;&|]*)/g;

async function revertProblem(
  $: Engine,
  dir: string,
  command: string,
): Promise<string | undefined> {
  for (const [, verb, rest] of command.matchAll(REVERT)) {
    const words = (rest ?? "").trim().split(/\s+/).filter(Boolean).map(unquote);
    const flags = words.filter((w) => w.startsWith("-"));
    const isStagedOnly =
      verb === "restore" &&
      flags.some((f) => f === "--staged" || f === "-S") &&
      !flags.some((f) => f === "--worktree" || f === "-W");
    const isNewBranch =
      verb === "checkout" &&
      flags.some((f) => ["-b", "-B", "--orphan"].includes(f));
    const paths = words.filter((w) => !w.startsWith("-"));
    if (isStagedOnly || isNewBranch || paths.length === 0) continue;
    // A branch or ref name matches no path, so it lists nothing here.
    const status = await git($, dir, [
      "status",
      "--porcelain",
      "--ignore-submodules=all",
      "--",
      ...paths,
    ]);
    const dirty = status.out
      .split("\n")
      .filter((l) => l.length > 3 && !l.startsWith("??") && !l.startsWith("!!"))
      .map((l) => l.slice(3));
    if (dirty.length > 0) {
      return `This git ${verb} would discard uncommitted edits in: ${dirty.slice(0, 5).join(", ")}${dirty.length > 5 ? ", ..." : ""}. Commit them first (or git stash), then mutate and revert against the commit. If discarding is really intended, ask the user to run it.`;
    }
  }
  return undefined;
}

// Guard 3. Pipeline files must be pure ASCII: the CI agent's JVM is not UTF-8,
// so one em dash fails the pipeline load with MalformedInputException before
// any stage runs.
function nonAsciiDeny(
  path: string,
  text: string,
): { deny: string } | undefined {
  const at = ASCII_ONLY_PATHS.test(path) ? text.search(/[^\x00-\x7F]/) : -1;
  if (at < 0) return undefined;
  const code = text.codePointAt(at) ?? 0;
  const hex = code.toString(16).toUpperCase().padStart(4, "0");
  const line = text.slice(0, at).split("\n").length;
  const count = text.match(/[^\x00-\x7F]/gu)?.length ?? 1;
  return {
    deny: `${path} is loaded by CI agents whose JVM is not UTF-8, so any non-ASCII character fails the build. Found ${count}, the first "${String.fromCodePoint(code)}" (U+${hex}) on line ${line} of the new text. Use ASCII: - for dashes, -> for arrows, != for not-equal, straight quotes.`,
  };
}

// Guard 4. A push whose pre-push hook found no changed files skipped lint and
// tests silently, and the push still exits 0 (typical of worktree pushes).
const PUSH = /\bgit\b(?:\s+-C\s+\S+)?\s+push\b/;

// Guard 6. Normalise the PR a create call returns: Bitbucket (id, created_on,
// author.display_name, destination.branch.name) or GitHub (number, created_at,
// user.login, base.ref).
type PrSummary = {
  id: string;
  createdAt?: string;
  author?: string;
  destination?: string;
};

function prSummary(raw: unknown): PrSummary | undefined {
  const r = rec(raw);
  const id = r.id ?? r.number;
  if (id === undefined) return undefined;
  return {
    id: String(id),
    createdAt: str(r.created_on) ?? str(r.created_at),
    author: str(rec(r.author).display_name) ?? str(rec(r.user).login),
    destination:
      str(rec(rec(r.destination).branch).name) ?? str(rec(r.base).ref),
  };
}

export const register: Register = (on) => {
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const command = e.command;
    if (/--cacheinfo|\bcommit\b|\bcheckout\b|\brestore\b/.test(command)) {
      const dir = await commandDir($, command);
      const problem =
        (await gitlinksProblem($, dir, command)) ??
        (await revertProblem($, dir, command));
      if (problem) return { deny: problem };
    }

    const ran = await next(e);
    if (PUSH.test(command) && ran.text?.includes(GATE_SKIPPED_TEXT)) {
      $.ui.toast("pre-push gate skipped lint and tests: run them yourself");
      return {
        ...ran,
        context: [
          ...(ran.context ?? []),
          "The pre-push gate listed no changed files and skipped lint and tests, so this push proves nothing. If it carried source changes, run the linter and the affected tests with coverage yourself before opening the PR.",
        ],
      };
    }
    return ran;
  });

  on(
    "tool.call",
    { tool: "Write" },
    ($, e, next) => nonAsciiDeny(e.file_path, e.content) ?? next(e),
  );
  on(
    "tool.call",
    { tool: "Edit" },
    ($, e, next) => nonAsciiDeny(e.file_path, e.new_string) ?? next(e),
  );

  // Guard 5. Merging is a human step: the agent opens the PR and hands over the link.
  on("tool.call", { tool: MERGE_PR_TOOL }, () => ({
    deny: "Merging is a human step in this repo. Give the user the PR link to merge it.",
  }));

  // Guard 6. The requested destination is not authoritative (a git host may fall
  // back to the repo's default branch), and an existing open PR with the same
  // source and destination comes back as if it were new.
  on("tool.call", { tool: CREATE_PR_TOOL }, async ($, e, next) => {
    const ran = await next(e);
    if (ran.deny !== undefined || ran.isError) return ran;
    let pr: PrSummary | undefined;
    try {
      pr = prSummary(JSON.parse(ran.text ?? ""));
    } catch {
      return ran;
    }
    if (!pr) return ran;

    const notes: string[] = [];
    const asked = str(rec(e)[DESTINATION_ARG]);
    const landed = pr.destination;
    if (asked && landed && landed !== asked) {
      notes.push(
        `PR #${pr.id} targets ${landed}, not ${asked}: the git host used the repo's default branch. Retarget it in the web UI (the MCP cannot) and do not describe it as targeting ${asked}.`,
      );
    }
    const ageMinutes =
      ((await $.clock.now()) - Date.parse(pr.createdAt ?? "")) / 60000;
    if (ageMinutes > EXISTING_PR_MINUTES) {
      notes.push(
        `PR #${pr.id} is not new: it was created ${pr.createdAt} by ${pr.author ?? "someone else"}, and the git host returned it because it has the same source and destination. Read it before treating it as yours.`,
      );
    }
    if (notes.length === 0) return ran;

    $.ui.toast(
      `PR #${pr.id}: ${asked && landed !== asked ? `landed on ${landed}` : "already existed"}`,
      { timeoutMs: 8000 },
    );
    return { ...ran, context: [...(ran.context ?? []), ...notes] };
  });
};
