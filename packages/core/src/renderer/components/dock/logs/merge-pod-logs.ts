/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * A combined logs tab reads at most this many pods of its workload. Every
 * refresh sends one request per pod, so a DaemonSet on a large cluster would
 * otherwise turn into a burst of requests every few seconds.
 */
export const maxCombinedLogsPods = 20;

/**
 * At most this many requests for the logs of one tab run at the same time, as
 * `kubectl logs --max-log-requests` does by default.
 */
export const maxConcurrentLogRequests = 5;

// ANSI colors used to tag the lines of each pod in a combined logs view. Red is
// left out because it reads as an error, the bright variants because they are
// hard to tell from the plain ones and nearly invisible on a light background.
const podColorPalette = ["36", "33", "35", "32", "34"];

const ansiEscapeSequenceRegex = /\u001B\[[\d;]*m/g;

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

/**
 * Deterministically picks an ANSI color for a pod so the same pod always gets
 * the same color across reloads/refreshes of the same combined logs tab.
 */
export function getPodLogColor(podName: string): string {
  return podColorPalette[hashString(podName) % podColorPalette.length];
}

/**
 * Extracts the leading RFC3339 timestamp token that the Kubernetes API prefixes
 * every log line with when `timestamps: true` is requested. Returns undefined
 * for lines that don't start with one (e.g. lines wrapped from a multi-line
 * message, which the API does not re-stamp).
 */
export function getLeadingTimestamp(line: string): string | undefined {
  return /^\d+\S+/.exec(line)?.[0];
}

/**
 * Orders two timestamps of log lines. The milliseconds decide; below them the
 * text does, which is exact for the fixed-width form the Kubernetes API emits.
 */
export function compareLogTimestamps(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  const timeA = Date.parse(a);
  const timeB = Date.parse(b);

  if (timeA !== timeB && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
    return timeA < timeB ? -1 : 1;
  }

  return a < b ? -1 : 1;
}

/**
 * Removes the color escape sequences, for the places where the logs leave the
 * application as plain text. The `[pod-name]` tags stay.
 */
export function stripAnsiColors(line: string): string {
  return line.replace(ansiEscapeSequenceRegex, "");
}

function tagLine(line: string, podName: string): string {
  const timestamp = getLeadingTimestamp(line);
  const tag = `\u001B[${getPodLogColor(podName)}m[${podName}]\u001B[0m`;

  if (!timestamp) {
    return `${tag} ${line}`;
  }

  return `${timestamp} ${tag}${line.slice(timestamp.length)}`;
}

interface TimedLine {
  timestamp: string;
  line: string;
}

/**
 * Gives every line the timestamp it sorts by: its own, or the one of the line
 * before it when it has none, so that a continuation stays with its message.
 */
function toTimedLines(lines: readonly string[]): TimedLine[] {
  let timestamp = "";

  return lines.map((line) => {
    timestamp = getLeadingTimestamp(line) ?? timestamp;

    return { timestamp, line };
  });
}

function mergeTimedLines(sources: TimedLine[][]): string[] {
  const cursors = sources.filter((source) => source.length > 0).map((lines) => ({ lines, index: 0 }));
  const merged: string[] = [];

  while (cursors.length > 0) {
    let winner = cursors[0];

    for (const cursor of cursors) {
      // Strictly older only: on a tie the earlier source keeps its turn.
      if (compareLogTimestamps(cursor.lines[cursor.index].timestamp, winner.lines[winner.index].timestamp) < 0) {
        winner = cursor;
      }
    }

    merged.push(winner.lines[winner.index].line);
    winner.index += 1;

    if (winner.index >= winner.lines.length) {
      cursors.splice(cursors.indexOf(winner), 1);
    }
  }

  return merged;
}

export interface MergePodLogsOptions {
  /**
   * Tag every line with the name of its pod. Defaults to true when the lines
   * come from more than one pod.
   */
  tagged?: boolean;
}

/**
 * Merges the per-pod log line arrays of a "combined logs" tab into a single
 * chronologically ordered array.
 *
 * Each pod's own lines are already in chronological order (as returned by the
 * Kubernetes API), so this performs a stable k-way merge across pods on the
 * leading timestamp of each line.
 *
 * When the lines are not tagged they are returned as they are, so single-pod
 * tabs keep their existing output.
 */
export function mergePodLogs(
  linesByPodName: ReadonlyMap<string, readonly string[]>,
  { tagged = linesByPodName.size > 1 }: MergePodLogsOptions = {},
): string[] {
  const sources = [...linesByPodName.entries()].map(([podName, lines]) =>
    toTimedLines(lines).map(({ timestamp, line }) => ({
      timestamp,
      line: tagged ? tagLine(line, podName) : line,
    })),
  );

  return mergeTimedLines(sources);
}

/**
 * Adds a batch of new lines to the lines already shown, keeping the whole in
 * chronological order. The pods of a combined tab are read one after the
 * other, so a new line of one pod can be older than the last line of another.
 */
export function mergeIntoLogs(logs: readonly string[], newLines: readonly string[]): string[] {
  if (newLines.length === 0) {
    return [...logs];
  }

  const timedLogs = toTimedLines(logs);
  const timedNewLines = toTimedLines(newLines);
  const oldestNewTimestamp = timedNewLines[0].timestamp;
  let start = timedLogs.length;

  while (start > 0 && compareLogTimestamps(timedLogs[start - 1].timestamp, oldestNewTimestamp) > 0) {
    start -= 1;
  }

  return [...logs.slice(0, start), ...mergeTimedLines([timedLogs.slice(start), timedNewLines])];
}
