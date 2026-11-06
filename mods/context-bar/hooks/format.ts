import type { Snapshot } from "../types";

export type Level = "ok" | "warn" | "hot";

// How close the context is to the point that matters: auto-compaction when
// it is on, the window itself when it is off.
export const level = (s: Snapshot): Level => {
  const ratio = s.tokens / (s.threshold ?? s.window);
  if (ratio >= 0.9) return "hot";
  if (ratio >= 0.7) return "warn";
  return "ok";
};

// Fill against the whole window, with a marker where auto-compaction fires.
export const bar = (s: Snapshot, width: number): string => {
  const filled = Math.min(width, Math.round((s.tokens / s.window) * width));
  const mark =
    s.threshold === undefined
      ? -1
      : Math.min(width - 1, Math.round((s.threshold / s.window) * width));
  let out = "";
  for (let i = 0; i < width; i++) {
    out += i === mark ? "┃" : i < filled ? "█" : "░";
  }
  return out;
};

export const kfmt = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : `${Math.round(n / 1000)}k`;

const LIMIT_LABEL: Record<string, string> = {
  five_hour: "5h",
  seven_day: "7d",
};

export const summary = (s: Snapshot): string => {
  const parts = [
    `${Math.round((s.tokens / s.window) * 100)}%`,
    `${kfmt(s.tokens)}/${kfmt(s.window)}`,
  ];
  if (s.threshold !== undefined) {
    const left = s.threshold - s.tokens;
    parts.push(left > 0 ? `compacts in ${kfmt(left)}` : "compaction due");
  }
  if (s.costUsd !== undefined) parts.push(`$${s.costUsd.toFixed(2)}`);
  for (const l of s.limits)
    parts.push(
      `${LIMIT_LABEL[l.kind] ?? l.kind} ${Math.round(l.percentUsed)}%`,
    );
  return parts.join(" · ");
};
