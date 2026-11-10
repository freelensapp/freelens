/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { resolveCustomColumnPriorities } from "./resolve-custom-column-priorities";

describe("resolveCustomColumnPriorities", () => {
  const listColumns = new Map([
    ["name", 120],
    ["status", 5],
    ["age", 10],
  ]);

  it("places an anchored column between its anchor and the next column", () => {
    const [column] = resolveCustomColumnPriorities(listColumns, [{ id: "custom", after: "age" }]);

    expect(column.priority).toBeLessThan(10);
    expect(column.priority).toBeGreaterThan(5);
  });

  it("keeps the given order when several columns share an anchor", () => {
    const [first, second] = resolveCustomColumnPriorities(listColumns, [
      { id: "first", after: "name" },
      { id: "second", after: "name" },
    ]);

    expect(first.priority).toBeLessThan(120);
    expect(second.priority).toBeLessThan(first.priority);
  });

  it("appends a column without an anchor", () => {
    const [column] = resolveCustomColumnPriorities(listColumns, [{ id: "custom" }]);

    expect(column.priority).toBeLessThan(5);
  });

  it("appends a column whose anchor this list does not have", () => {
    const [column] = resolveCustomColumnPriorities(listColumns, [{ id: "custom", after: "not-in-this-list" }]);

    expect(column.priority).toBeLessThan(5);
  });

  it("keeps the given order when several columns are appended", () => {
    const [first, second] = resolveCustomColumnPriorities(listColumns, [{ id: "first" }, { id: "second" }]);

    expect(second.priority).toBeLessThan(first.priority);
  });

  it("allows a custom column to be anchored to another custom column", () => {
    const [first, second] = resolveCustomColumnPriorities(listColumns, [
      { id: "first", after: "name" },
      { id: "second", after: "first" },
    ]);

    expect(second.priority).toBeLessThan(first.priority);
    expect(second.priority).toBeGreaterThan(10);
  });

  it("does not lose the other fields of a column", () => {
    const [column] = resolveCustomColumnPriorities(listColumns, [{ id: "custom", title: "Instance type" }]);

    expect(column.title).toBe("Instance type");
  });
});
