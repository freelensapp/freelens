/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * At most this many requests for the logs of one tab run at the same time, as
 * `kubectl logs --max-log-requests` does by default.
 */
export const maxConcurrentLogRequests = 5;

/**
 * A logs tab holds at most this many lines, of one pod or shared between the
 * pods of a workload. Scrolling to its top asks every pod for more lines, up
 * to its share of them, and the refresh drops the oldest lines once the new
 * ones take the tab over the limit. Without it a tab would grow with every
 * scroll and every refresh for as long as it stays open, until it no longer
 * fits in the cluster frame. At some 200 bytes a line, a full tab takes about
 * 20 MB, and so does each reload of its tail.
 */
export const maxLogLines = 100_000;

/**
 * "All logs" of a combined logs tab reads at most this many bytes, shared out
 * between its pods with `limitBytes`: the logs that fit in their share are
 * read whole, and the longer ones share what is left for their most recent
 * lines. The file is merged in the cluster frame, which takes about ten times
 * as much memory: 32 MiB of logs from 20 pods peak at some 300 MB.
 */
export const maxCombinedLogsDownloadBytes = 32 * 1024 * 1024;

/**
 * The colors of the pod names in a combined logs view, as ANSI codes of the
 * 256 color palette: teal, orange, purple, green, blue and pink. The logs are
 * white on black in the dark theme and black on white in the light one, and
 * these read on both, with a contrast between 4 and 5 to 1. The 16 basic
 * colors do not: blue disappears on black, yellow and cyan on white. Red is
 * left out because it reads as an error.
 */
export const podLogColors = ["38;5;30", "38;5;130", "38;5;129", "38;5;28", "38;5;27", "38;5;162"];

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
  return podLogColors[hashString(podName) % podLogColors.length];
}

/**
 * The timestamp that the Kubernetes API prefixes every log line with when
 * `timestamps: true` is requested, as the source of a regular expression:
 * RFC 3339 with up to nanoseconds, such as `2026-01-01T00:00:00.123456789Z`.
 */
export const logTimestampPattern = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})`;

const leadingTimestampRegex = new RegExp(`^${logTimestampPattern}(?=\\s|$)`);

/**
 * Extracts the leading timestamp of a log line. Returns undefined for a line
 * that does not start with one: a line wrapped from a multi-line message,
 * which the API does not re-stamp, or what follows a carriage return, which
 * can start with digits that are not a date, such as `12.5MB/40MB`.
 */
export function getLeadingTimestamp(line: string): string | undefined {
  return leadingTimestampRegex.exec(line)?.[0];
}

/**
 * Splits the logs the API returned into lines. Only the line break that ends
 * the logs is removed, so the last line keeps the spaces it ends with and is
 * the same line when the next request returns it again. "\r\n" is one line
 * break, as the logs of Windows containers end their lines; a "\r" alone, as
 * a progress bar writes it, starts a line of its own without a timestamp.
 */
export function splitLogLines(logs: string): string[] {
  return logs.replace(/\r?\n$/, "").split(/\r?\n|\r/);
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

function tagLine(line: string, podName: string, color: string): string {
  const timestamp = getLeadingTimestamp(line);
  const tag = `\u001B[${color}m[${podName}]\u001B[0m`;

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

  /**
   * The color of the tag of every pod, by pod name. A pod without one gets a
   * color from its name, which can be the color of another pod.
   */
  colors?: ReadonlyMap<string, string>;
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
  { tagged = linesByPodName.size > 1, colors }: MergePodLogsOptions = {},
): string[] {
  const sources = [...linesByPodName.entries()].map(([podName, lines]) => {
    const color = colors?.get(podName) ?? getPodLogColor(podName);

    return toTimedLines(lines).map(({ timestamp, line }) => ({
      timestamp,
      line: tagged ? tagLine(line, podName, color) : line,
    }));
  });

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

  const timedNewLines = toTimedLines(newLines);
  const oldestNewTimestamp = timedNewLines[0].timestamp;
  let start = logs.length;

  // From the bottom, and only as far as the lines newer than the new ones go:
  // the tab holds up to `maxLogLines` lines and is merged at every
  // refresh, while the new lines rarely reach far back. A line without a
  // timestamp moves with the message it continues.
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const timestamp = getLeadingTimestamp(logs[index]);

    if (timestamp === undefined) {
      continue;
    }

    if (compareLogTimestamps(timestamp, oldestNewTimestamp) <= 0) {
      break;
    }

    start = index;
  }

  return [...logs.slice(0, start), ...mergeTimedLines([toTimedLines(logs.slice(start)), timedNewLines])];
}

/**
 * The newest `maxLines` lines of `logs`, starting at a line with a timestamp,
 * so that the first line shown is not the continuation of a message cut off.
 */
export function keepNewestLogLines(logs: string[], maxLines: number): string[] {
  if (logs.length <= maxLines) {
    return logs;
  }

  let start = logs.length - maxLines;

  while (start < logs.length && getLeadingTimestamp(logs[start]) === undefined) {
    start += 1;
  }

  return logs.slice(start);
}

/**
 * The lines of `logs` older than `timestamp`, the start of a newer answer for
 * the same tab, without the ones that answer brings again: a line with a
 * timestamp that `again` has word for word, and the lines without a timestamp
 * that continue it. Lines before the first one with a timestamp, such as an
 * error message, are left out.
 */
export function linesBefore(logs: readonly string[], timestamp: string, again: ReadonlySet<string>): string[] {
  const kept: string[] = [];
  let keeping = false;

  for (const line of logs) {
    const lineTimestamp = getLeadingTimestamp(line);

    if (lineTimestamp !== undefined) {
      if (compareLogTimestamps(lineTimestamp, timestamp) >= 0) {
        break;
      }

      keeping = !again.has(line);
    }

    if (keeping) {
      kept.push(line);
    }
  }

  return kept;
}

/**
 * The timestamp of the first line of `lines` that has one.
 */
export function getFirstTimestamp(lines: readonly string[]): string | undefined {
  for (const line of lines) {
    const timestamp = getLeadingTimestamp(line);

    if (timestamp !== undefined) {
      return timestamp;
    }
  }

  return undefined;
}

/**
 * The line a tab shows where lines of a pod may be missing, with the timestamp
 * of the first line after them, so that it stays right in front of that line.
 */
export function missingLinesMarker(timestamp: string): string {
  return `${timestamp} ⋯ Some lines may be missing here: the log was rotated or the container restarted between two refreshes.`;
}
