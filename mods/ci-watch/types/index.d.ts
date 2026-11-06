export type Run = {
  label: string;
  number: number;
  result: string | null;
  isBuilding: boolean;
  url: string;
  startedAt: number;
  durationMs: number;
  gate: string | null;
};

export type Poll = {
  runs: Run[];
  checkedAt: number;
  error: string | null;
};

declare module "claude-code" {
  interface PluginState {
    "ci-watch": { poll: Poll | null };
  }
}
