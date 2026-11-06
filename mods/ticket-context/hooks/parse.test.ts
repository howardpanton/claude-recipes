import { expect, test } from "claude-code/testing";

import {
  githubIssue,
  jiraKey,
  linkedWorktree,
  parseRemote,
  shorten,
  tildify,
} from "./parse";

test("jiraKey reads the ticket from either branch style and ignores sprint branches", async () => {
  expect(jiraKey("feature/PROJ-123-short-slug")).toBe("PROJ-123");
  expect(jiraKey("proj-456/other-slug")).toBe("PROJ-456");
  expect(jiraKey("release/sprint-2030-01")).toBe(null);
  expect(jiraKey("release/2026-01-15")).toBe(null);
  expect(jiraKey("develop")).toBe(null);
});

test("githubIssue needs a number at a path or word edge", async () => {
  expect(githubIssue("123-fix-login")).toBe("123");
  expect(githubIssue("fix/123-login")).toBe("123");
  expect(githubIssue("fix/issue-45")).toBe("45");
  expect(githubIssue("fix/#7")).toBe("7");
  expect(githubIssue("release/2026-01-15")).toBe(null);
  expect(githubIssue("develop")).toBe(null);
});

test("parseRemote handles ssh and https for both hosts", async () => {
  expect(parseRemote("git@bitbucket.org:acme/widgets.git")).toEqual({
    host: "bitbucket",
    owner: "acme",
    repo: "widgets",
  });
  expect(parseRemote("https://github.com/acme/widgets.git")).toEqual({
    host: "github",
    owner: "acme",
    repo: "widgets",
  });
  expect(parseRemote("https://user@github.com/acme/widgets-deploy")).toEqual({
    host: "github",
    owner: "acme",
    repo: "widgets-deploy",
  });
  expect(parseRemote("ssh://git@git.example.com/acme/widgets.git")).toEqual({
    host: "other",
    owner: "acme",
    repo: "widgets",
  });
  expect(parseRemote("not a url")).toBe(null);
});

test("shorten cuts with an ellipsis", async () => {
  expect(shorten("abcdef", 4)).toBe("abc…");
  expect(shorten("abc", 4)).toBe("abc");
});

test("linkedWorktree is the top level only when the git dir differs from the common dir", async () => {
  const worktree = [
    "/Users/me/code/repo-worktrees/fix",
    "/Users/me/code/repo/.git/worktrees/fix",
    "/Users/me/code/repo/.git",
  ].join("\n");
  expect(linkedWorktree(worktree)).toBe("/Users/me/code/repo-worktrees/fix");
  expect(
    linkedWorktree(
      [
        "/Users/me/code/repo",
        "/Users/me/code/repo/.git",
        "/Users/me/code/repo/.git",
      ].join("\n"),
    ),
  ).toBe(null);
  const submodule =
    "/Users/me/code/repo/apps/a\n/Users/me/code/repo/.git/modules/apps/a\n/Users/me/code/repo/.git/modules/apps/a";
  expect(linkedWorktree(submodule)).toBe(null);
  expect(linkedWorktree(null)).toBe(null);
  expect(linkedWorktree("")).toBe(null);
});

test("tildify shortens a home directory", async () => {
  expect(tildify("/Users/me/code/repo-worktrees/fix")).toBe(
    "~/code/repo-worktrees/fix",
  );
  expect(tildify("/home/me/x")).toBe("~/x");
  expect(tildify("/opt/x")).toBe("/opt/x");
});
