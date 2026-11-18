/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { getYamlFoldingRanges } from "./yaml-folding-ranges";

const ranges = (yaml: string) => getYamlFoldingRanges(yaml.split("\n")).map(({ start, end }) => [start, end]);

describe("getYamlFoldingRanges", () => {
  it("folds a key whose sequence items are written at its own indentation", () => {
    const yaml = [
      "spec:", // 1
      "  containers:", // 2
      "  - name: one", // 3
      "    image: busybox", // 4
      "  - name: two", // 5
      "    image: busybox", // 6
      "  restartPolicy: Always", // 7
    ].join("\n");

    expect(ranges(yaml)).toEqual([
      [1, 7],
      [2, 6],
      [3, 4],
      [5, 6],
    ]);
  });

  it("folds a nested key with indentless items inside an item", () => {
    const yaml = [
      "containers:", // 1
      "- name: one", // 2
      "  command:", // 3
      "  - sleep", // 4
      '  - "3600"', // 5
      "  image: busybox", // 6
    ].join("\n");

    expect(ranges(yaml)).toEqual([
      [1, 6],
      [2, 6],
      [3, 5],
    ]);
  });

  it("folds sequences written with an indentation as before", () => {
    const yaml = [
      "volumes:", // 1
      "  - name: data", // 2
      "    emptyDir: {}", // 3
      "  - name: cache", // 4
      "    emptyDir: {}", // 5
    ].join("\n");

    expect(ranges(yaml)).toEqual([
      [1, 5],
      [2, 3],
      [4, 5],
    ]);
  });

  it("ends a range on its last line that is not blank", () => {
    const yaml = [
      "metadata:", // 1
      "  name: one", // 2
      "", // 3
      "spec:", // 4
      "  replicas: 1", // 5
      "", // 6
    ].join("\n");

    expect(ranges(yaml)).toEqual([
      [1, 2],
      [4, 5],
    ]);
  });

  it("gives no range to keys and items with nothing below them", () => {
    expect(ranges(["kind: Pod", "apiVersion: v1"].join("\n"))).toEqual([]);
    expect(ranges(["- a", "- b"].join("\n"))).toEqual([]);
  });
});
