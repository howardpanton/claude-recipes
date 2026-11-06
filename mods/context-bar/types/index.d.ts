export type Snapshot = {
  /** Input tokens the last response was answered over. */
  tokens: number;
  /** The model's context window, in tokens. */
  window: number;
  /** Where auto-compaction runs, in tokens; absent when it is off. */
  threshold?: number;
  /** Session cost so far, in US dollars. */
  costUsd?: number;
  /** Rate-limit windows, e.g. five_hour 41%. */
  limits: { kind: string; percentUsed: number }[];
};

declare module "claude-code" {
  interface PluginState {
    "context-bar": { snap: Snapshot | null };
  }
}
