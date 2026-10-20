/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { customTableColumnSlug, isCustomTableColumn } from "./custom-table-column";

describe("isCustomTableColumn", () => {
  const column = () => ({
    id: "custom-column:some-id",
    kind: "Node",
    apiVersion: "v1",
    title: "Instance type",
    jsonPath: ".metadata.labels['node.kubernetes.io/instance-type']",
  });

  it("accepts a column", () => {
    expect(isCustomTableColumn(column())).toBe(true);
  });

  it("accepts several api versions", () => {
    expect(isCustomTableColumn({ ...column(), apiVersion: ["v1", "v1beta1"] })).toBe(true);
  });

  it("accepts an anchor", () => {
    expect(isCustomTableColumn({ ...column(), after: "age" })).toBe(true);
  });

  it("accepts a cluster scope", () => {
    expect(isCustomTableColumn({ ...column(), scope: { cluster: "some-cluster-id" } })).toBe(true);
  });

  it.each(["id", "kind", "apiVersion", "title", "jsonPath"])("rejects a column without %s", (field) => {
    const { [field as keyof ReturnType<typeof column>]: _removed, ...rest } = column();

    expect(isCustomTableColumn(rest)).toBe(false);
  });

  it("rejects an empty api version list", () => {
    expect(isCustomTableColumn({ ...column(), apiVersion: [] })).toBe(false);
  });

  it("rejects a scope without a cluster", () => {
    expect(isCustomTableColumn({ ...column(), scope: {} })).toBe(false);
  });

  it.each([undefined, null, "a string", 42])("rejects %s", (value) => {
    expect(isCustomTableColumn(value)).toBe(false);
  });
});

describe("customTableColumnSlug", () => {
  it("drops the prefix of a generated id", () => {
    expect(customTableColumnSlug("custom-column:some-id")).toBe("some-id");
  });

  it("keeps an id that has no prefix", () => {
    expect(customTableColumnSlug("my-column")).toBe("my-column");
  });

  it("replaces what cannot appear in a class name", () => {
    expect(customTableColumnSlug("my column/1")).toBe("my-column-1");
  });
});
