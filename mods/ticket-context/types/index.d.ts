export type Ticket = {
  kind: "jira" | "github";
  key: string;
  title: string | null;
  status: string | null;
  url: string | null;
};

export type Pr = {
  id: string;
  title: string;
  state: string;
  url: string;
  isSameBranch: boolean;
};

export type Context = {
  branch: string;
  worktree: string | null;
  remote: string | null;
  ticket: Ticket | null;
  prs: Pr[];
  checkedAt: number;
  errors: string[];
};

declare module "claude-code" {
  interface PluginState {
    "ticket-context": { context: Context | null };
  }
}
