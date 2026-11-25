/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { languages } from "monaco-editor";

const sequenceItem = /^\s*-(\s|$)/;

/**
 * The folding ranges of a YAML document, by indentation as the editor folds it, except that the items of a sequence
 * written at the same indentation as their key (`containers:` then `- name: one`, as Freelens and kubectl write it)
 * belong to that key. Monaco folds YAML by indentation only, so without this such a key cannot be folded as a whole:
 * only each of its items can.
 *
 * A range ends on the last line that is not blank, so that the blank lines after a block stay visible.
 */
export function getYamlFoldingRanges(lines: string[]): languages.FoldingRange[] {
  const ranges: languages.FoldingRange[] = [];
  const open: Array<{ start: number; level: number }> = [];
  let lastNonBlank = -1;

  const close = (level: number) => {
    while (open.length > 0 && open[open.length - 1].level >= level) {
      const { start } = open.pop()!;

      if (lastNonBlank > start) {
        ranges.push({ start: start + 1, end: lastNonBlank + 1 });
      }
    }
  };

  lines.forEach((line, index) => {
    const indent = line.search(/\S/);

    if (indent === -1) {
      return;
    }

    // An item of a sequence sits one level deeper than its own indentation, inside the key above it.
    const level = indent + (sequenceItem.test(line) ? 1 : 0);

    close(level);
    open.push({ start: index, level });
    lastNonBlank = index;
  });

  close(-1);

  return ranges.sort((a, b) => a.start - b.start);
}
