/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getLeadingTimestamp, getPodLogColor, mergePodLogs } from "../merge-pod-logs";

describe("mergePodLogs", () => {
  it("returns the lines unchanged when there is a single source pod", () => {
    const lines = ["2024-01-01T00:00:00.000000000Z hello", "2024-01-01T00:00:01.000000000Z world"];

    expect(mergePodLogs(new Map([["pod-a", lines]]))).toEqual(lines);
  });

  it("returns an empty array when given no pods", () => {
    expect(mergePodLogs(new Map())).toEqual([]);
  });

  it("interleaves lines from several pods in chronological order", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["2024-01-01T00:00:00.000000000Z a1", "2024-01-01T00:00:02.000000000Z a2"]],
        ["pod-b", ["2024-01-01T00:00:01.000000000Z b1"]],
      ]),
    );

    expect(merged.map((line) => getLeadingTimestamp(line))).toEqual([
      "2024-01-01T00:00:00.000000000Z",
      "2024-01-01T00:00:01.000000000Z",
      "2024-01-01T00:00:02.000000000Z",
    ]);
    expect(merged[0]).toContain("[pod-a]");
    expect(merged[0]).toContain("a1");
    expect(merged[1]).toContain("[pod-b]");
    expect(merged[1]).toContain("b1");
    expect(merged[2]).toContain("[pod-a]");
    expect(merged[2]).toContain("a2");
  });

  it("skips pods with no lines", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["2024-01-01T00:00:00.000000000Z a1"]],
        ["pod-b", []],
      ]),
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toContain("[pod-a]");
  });

  it("tags a line without a leading timestamp using only the pod name", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["not-a-timestamp continuation line"]],
        ["pod-b", ["2024-01-01T00:00:00.000000000Z b1"]],
      ]),
    );

    const taggedLine = merged.find((line) => line.includes("continuation line"));

    expect(taggedLine).toContain("[pod-a]");
    expect(taggedLine).toContain("not-a-timestamp continuation line");
  });

  it("assigns the same color to a pod name across calls", () => {
    expect(getPodLogColor("pod-a")).toBe(getPodLogColor("pod-a"));
  });

  it("colors the whole line, not just the pod-name tag", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["2024-01-01T00:00:00.000000000Z hello world"]],
        ["pod-b", []],
      ]),
    );
    const color = getPodLogColor("pod-a");

    // The color escape must stay open across the tag and the log content, and
    // only reset (\x1b[0m) once, at the very end of the line -- not right
    // after the tag, which would leave the log content in the default color.
    expect(merged[0]).toBe(`2024-01-01T00:00:00.000000000Z \x1b[${color}m[pod-a] hello world\x1b[0m`);
  });
});
