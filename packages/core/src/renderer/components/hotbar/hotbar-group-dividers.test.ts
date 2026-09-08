/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computeGroupDividers } from "./hotbar-group-dividers";

describe("computeGroupDividers", () => {
  it("returns no dividers when no items have a group", () => {
    expect(computeGroupDividers([{}, {}, undefined])).toEqual([null, null, null]);
  });

  it("marks the first cell of a run of same-group items, not the rest", () => {
    expect(computeGroupDividers([{ group: "QA" }, { group: "QA" }, { group: "QA" }])).toEqual(["QA", null, null]);
  });

  it("marks a new divider when the group changes between adjacent items", () => {
    expect(computeGroupDividers([{ group: "Prod" }, { group: "Prod" }, { group: "QA" }, { group: "Dev" }])).toEqual([
      "Prod",
      null,
      "QA",
      "Dev",
    ]);
  });

  it("does not add a divider for ungrouped items, but resets the run so the same group reappearing later gets its own divider", () => {
    expect(computeGroupDividers([{ group: "QA" }, {}, { group: "QA" }])).toEqual(["QA", null, "QA"]);
  });

  it("treats empty cells (undefined) like ungrouped items", () => {
    expect(computeGroupDividers([{ group: "QA" }, undefined, { group: "QA" }])).toEqual(["QA", null, "QA"]);
  });

  it("ignores empty-string groups", () => {
    expect(computeGroupDividers([{ group: "" }, { group: "QA" }])).toEqual([null, "QA"]);
  });
});
