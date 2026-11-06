import { expect, test } from "claude-code/testing";

import { bar, kfmt, level, summary } from "./format";

const s = {
  tokens: 100_000,
  window: 200_000,
  threshold: 160_000,
  costUsd: 3.214,
  limits: [{ kind: "five_hour", percentUsed: 41.4 }],
};

test("bar fills against the window and marks the auto-compact threshold", async () => {
  expect(bar(s, 10)).toBe("█████░░░┃░");
  expect(bar({ ...s, threshold: undefined }, 10)).toBe("█████░░░░░");
  expect(bar({ ...s, tokens: 400_000 }, 10)).toBe("████████┃█");
});

test("level measures against the threshold, or the window when compaction is off", async () => {
  expect(level(s)).toBe("ok"); // 100k of 160k = 62%
  expect(level({ ...s, tokens: 120_000 })).toBe("warn"); // 75%
  expect(level({ ...s, tokens: 150_000 })).toBe("hot"); // 94%
  expect(level({ ...s, tokens: 150_000, threshold: undefined })).toBe("warn"); // 75% of the window
});

test("summary reads like the status line", async () => {
  expect(summary(s)).toBe("50% · 100k/200k · compacts in 60k · $3.21 · 5h 41%");
  expect(
    summary({ ...s, tokens: 170_000, costUsd: undefined, limits: [] }),
  ).toBe("85% · 170k/200k · compaction due");
  expect(kfmt(1_000_000)).toBe("1.0M");
});
