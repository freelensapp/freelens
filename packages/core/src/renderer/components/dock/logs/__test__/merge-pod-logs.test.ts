/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  compareLogTimestamps,
  getLeadingTimestamp,
  getPodLogColor,
  mergeIntoLogs,
  mergePodLogs,
  podLogColors,
  stripAnsiColors,
} from "../merge-pod-logs";

// Relative luminance and contrast ratio, as WCAG 2 defines them.
function getLuminance([red, green, blue]: number[]): number {
  const [r, g, b] = [red, green, blue].map((value) => {
    const channel = value / 255;

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrast(a: number[], b: number[]): number {
  const [lighter, darker] = [getLuminance(a), getLuminance(b)].sort((x, y) => y - x);

  return (lighter + 0.05) / (darker + 0.05);
}

// The 6x6x6 color cube of the 256 color palette, codes 16 to 231.
function getRgbOfPaletteColor(code: string): number[] {
  const levels = [0, 95, 135, 175, 215, 255];
  const index = Number(code.split(";")[2]) - 16;

  return [levels[Math.floor(index / 36)], levels[Math.floor(index / 6) % 6], levels[index % 6]];
}

describe("mergePodLogs", () => {
  it("returns the lines unchanged when there is a single source pod", () => {
    const lines = ["2024-01-01T00:00:00.000000000Z hello", "2024-01-01T00:00:01.000000000Z world"];

    expect(mergePodLogs(new Map([["pod-a", lines]]))).toEqual(lines);
  });

  it("tags the lines of a single pod when asked to", () => {
    const merged = mergePodLogs(new Map([["pod-a", ["2024-01-01T00:00:00.000000000Z hello"]]]), { tagged: true });

    expect(stripAnsiColors(merged[0])).toBe("2024-01-01T00:00:00.000000000Z [pod-a] hello");
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

    expect(merged.map(stripAnsiColors)).toEqual([
      "2024-01-01T00:00:00.000000000Z [pod-a] a1",
      "2024-01-01T00:00:01.000000000Z [pod-b] b1",
      "2024-01-01T00:00:02.000000000Z [pod-a] a2",
    ]);
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

  it("keeps a line without a timestamp right after the line it continues", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["2024-01-01T00:00:02.000000000Z a1", "continuation of a1"]],
        ["pod-b", ["2024-01-01T00:00:01.000000000Z b1", "2024-01-01T00:00:03.000000000Z b2"]],
      ]),
    );

    expect(merged.map(stripAnsiColors)).toEqual([
      "2024-01-01T00:00:01.000000000Z [pod-b] b1",
      "2024-01-01T00:00:02.000000000Z [pod-a] a1",
      "[pod-a] continuation of a1",
      "2024-01-01T00:00:03.000000000Z [pod-b] b2",
    ]);
  });

  it("assigns the same color to a pod name across calls", () => {
    expect(getPodLogColor("pod-a")).toBe(getPodLogColor("pod-a"));
  });

  it.each(podLogColors)("uses the color %s, which reads both on the black and on the white of the themes", (code) => {
    const color = getRgbOfPaletteColor(code);

    expect(getContrast(color, [0, 0, 0])).toBeGreaterThan(4);
    expect(getContrast(color, [255, 255, 255])).toBeGreaterThan(4);
  });

  it("uses the colors it is given for the pods", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["2024-01-01T00:00:00.000000000Z a1"]],
        ["pod-b", ["2024-01-01T00:00:01.000000000Z b1"]],
      ]),
      {
        colors: new Map([
          ["pod-a", podLogColors[0]],
          ["pod-b", podLogColors[1]],
        ]),
      },
    );

    expect(merged).toEqual([
      `2024-01-01T00:00:00.000000000Z \x1b[${podLogColors[0]}m[pod-a]\x1b[0m a1`,
      `2024-01-01T00:00:01.000000000Z \x1b[${podLogColors[1]}m[pod-b]\x1b[0m b1`,
    ]);
  });

  it("colors the pod-name tag only, and leaves the message in the color of the theme", () => {
    const merged = mergePodLogs(
      new Map([
        ["pod-a", ["2024-01-01T00:00:00.000000000Z hello world"]],
        ["pod-b", []],
      ]),
    );
    const color = getPodLogColor("pod-a");

    expect(merged[0]).toBe(`2024-01-01T00:00:00.000000000Z \x1b[${color}m[pod-a]\x1b[0m hello world`);
  });

  it("keeps the timestamp at the start of the line, where the log list looks for it", () => {
    const [line] = mergePodLogs(new Map([["pod-a", ["2024-01-01T00:00:00.000000000Z hello"]]]), { tagged: true });

    expect(getLeadingTimestamp(line)).toBe("2024-01-01T00:00:00.000000000Z");
  });
});

describe("compareLogTimestamps", () => {
  it("orders by time", () => {
    expect(compareLogTimestamps("2024-01-01T00:00:00.000000000Z", "2024-01-01T00:00:01.000000000Z")).toBeLessThan(0);
    expect(compareLogTimestamps("2024-01-01T00:00:01.000000000Z", "2024-01-01T00:00:00.000000000Z")).toBeGreaterThan(0);
    expect(compareLogTimestamps("2024-01-01T00:00:00.000000000Z", "2024-01-01T00:00:00.000000000Z")).toBe(0);
  });

  it("tells apart two lines of the same millisecond", () => {
    expect(compareLogTimestamps("2024-01-01T00:00:00.123456788Z", "2024-01-01T00:00:00.123456789Z")).toBeLessThan(0);
  });

  it("orders by time and not by text when the nodes are in different time zones", () => {
    expect(compareLogTimestamps("2024-01-01T02:00:00.000000000+02:00", "2024-01-01T00:30:00.000000000Z")).toBeLessThan(
      0,
    );
  });

  it("puts a line without a timestamp first", () => {
    expect(compareLogTimestamps("", "2024-01-01T00:00:00.000000000Z")).toBeLessThan(0);
  });
});

describe("mergeIntoLogs", () => {
  const logs = [
    "2024-01-01T00:00:00.000000000Z [pod-a] a1",
    "2024-01-01T00:00:02.000000000Z [pod-a] a2",
    "2024-01-01T00:00:04.000000000Z [pod-a] a3",
  ];

  it("adds newer lines at the bottom", () => {
    const newLines = ["2024-01-01T00:00:05.000000000Z [pod-b] b1"];

    expect(mergeIntoLogs(logs, newLines)).toEqual([...logs, ...newLines]);
  });

  it("puts a line older than the last ones in its place", () => {
    const merged = mergeIntoLogs(logs, [
      "2024-01-01T00:00:03.000000000Z [pod-b] b1",
      "2024-01-01T00:00:05.000000000Z [pod-b] b2",
    ]);

    expect(merged).toEqual([
      "2024-01-01T00:00:00.000000000Z [pod-a] a1",
      "2024-01-01T00:00:02.000000000Z [pod-a] a2",
      "2024-01-01T00:00:03.000000000Z [pod-b] b1",
      "2024-01-01T00:00:04.000000000Z [pod-a] a3",
      "2024-01-01T00:00:05.000000000Z [pod-b] b2",
    ]);
  });

  it("returns the lines as they are when nothing is new", () => {
    expect(mergeIntoLogs(logs, [])).toEqual(logs);
  });

  it("starts from an empty list", () => {
    expect(mergeIntoLogs([], ["2024-01-01T00:00:00.000000000Z a1"])).toEqual(["2024-01-01T00:00:00.000000000Z a1"]);
  });
});

describe("stripAnsiColors", () => {
  it("removes the colors and keeps the tag", () => {
    expect(stripAnsiColors("2024-01-01T00:00:00Z \x1b[36m[pod-a]\x1b[0m hello")).toBe(
      "2024-01-01T00:00:00Z [pod-a] hello",
    );
  });
});
