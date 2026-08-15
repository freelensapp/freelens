/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// ANSI 256-color codes used to tag each pod's lines in a combined logs view.
// Chosen to stay legible on both light and dark terminal-style backgrounds and
// to avoid red/white, which are already used for error/plain text.
const podColorPalette = ["36", "33", "35", "32", "34", "96", "93", "95", "92", "94"];

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

function tagLine(line: string, podName: string): string {
  const color = getPodLogColor(podName);
  const timestamp = getLeadingTimestamp(line);
  const tag = `[${color}m[${podName}]`;

  if (!timestamp) {
    return `${tag} ${line}[0m`;
  }

  return `${timestamp} ${tag}${line.slice(timestamp.length)}[0m`;
}

/**
 * Merges the per-pod log line arrays of a "combined logs" tab into a single
 * chronologically ordered array.
 *
 * Each pod's own lines are already in chronological order (as returned by the
 * Kubernetes API), so this performs a stable k-way merge across pods by
 * comparing each line's leading timestamp lexicographically -- which is valid
 * because Kubernetes always emits RFC3339Nano timestamps in a fixed-width,
 * zero-padded, UTC ("Z") form.
 *
 * When there is a single source pod, its lines are returned unchanged -- no
 * pod-name tag/color is added -- so single-pod tabs keep their existing,
 * untagged output.
 */
export function mergePodLogs(linesByPodName: ReadonlyMap<string, readonly string[]>): string[] {
  if (linesByPodName.size <= 1) {
    return [...linesByPodName.values()][0]?.slice() ?? [];
  }

  const cursors = [...linesByPodName.entries()]
    .map(([podName, lines]) => ({ podName, lines, index: 0 }))
    .filter((cursor) => cursor.lines.length > 0);
  const merged: string[] = [];

  while (cursors.length > 0) {
    let winner = cursors[0];

    for (const cursor of cursors) {
      const winnerTimestamp = getLeadingTimestamp(winner.lines[winner.index]) ?? "";
      const cursorTimestamp = getLeadingTimestamp(cursor.lines[cursor.index]) ?? "";

      if (cursorTimestamp < winnerTimestamp) {
        winner = cursor;
      }
    }

    merged.push(tagLine(winner.lines[winner.index], winner.podName));
    winner.index += 1;

    if (winner.index >= winner.lines.length) {
      cursors.splice(cursors.indexOf(winner), 1);
    }
  }

  return merged;
}
