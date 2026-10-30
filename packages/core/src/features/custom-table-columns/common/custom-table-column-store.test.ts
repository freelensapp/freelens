/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import addCustomTableColumnInjectable from "./add-custom-table-column.injectable";
import { customTableColumnIdPrefix } from "./custom-table-column";
import customTableColumnsInjectable from "./custom-table-columns.injectable";
import removeCustomTableColumnInjectable from "./remove-custom-table-column.injectable";
import updateCustomTableColumnInjectable from "./update-custom-table-column.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { AddCustomTableColumn } from "./add-custom-table-column.injectable";
import type { RemoveCustomTableColumn } from "./remove-custom-table-column.injectable";
import type { UpdateCustomTableColumn } from "./update-custom-table-column.injectable";

describe("custom table column store", () => {
  let di: DiContainer;
  let addColumn: AddCustomTableColumn;
  let updateColumn: UpdateCustomTableColumn;
  let removeColumn: RemoveCustomTableColumn;
  let columns: ReturnType<typeof customTableColumnsInjectable.instantiate>;

  const definition = {
    kind: "Node",
    apiVersion: "v1",
    title: "Instance type",
    jsonPath: ".metadata.labels['node.kubernetes.io/instance-type']",
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    // The global override returns the same id every time, which would make every added column
    // collide.
    let addedCount = 0;

    di.override(getRandomIdInjectionToken, () => () => `some-id-${++addedCount}`);

    addColumn = di.inject(addCustomTableColumnInjectable);
    updateColumn = di.inject(updateCustomTableColumnInjectable);
    removeColumn = di.inject(removeCustomTableColumnInjectable);
    columns = di.inject(customTableColumnsInjectable);
  });

  it("starts out empty", () => {
    expect(columns.get()).toEqual([]);
  });

  describe("adding", () => {
    it("gives the column a prefixed id", () => {
      const added = addColumn(definition);

      expect(added.id.startsWith(customTableColumnIdPrefix)).toBe(true);
    });

    it("stores it in the user preferences", () => {
      addColumn(definition);

      expect(di.inject(userPreferencesStateInjectable).customTableColumns).toHaveLength(1);
    });

    it("keeps the order columns were added in", () => {
      addColumn({ ...definition, title: "First" });
      addColumn({ ...definition, title: "Second" });

      expect(columns.get().map((column) => column.title)).toEqual(["First", "Second"]);
    });
  });

  describe("updating", () => {
    it("changes the given fields", () => {
      const added = addColumn(definition);

      updateColumn(added.id, { title: "Renamed" });

      expect(columns.get()[0]).toMatchObject({ id: added.id, title: "Renamed", jsonPath: definition.jsonPath });
    });

    it("does not let the id be changed", () => {
      const added = addColumn(definition);

      updateColumn(added.id, { title: "Renamed", id: "something-else" } as never);

      expect(columns.get()[0].id).toBe(added.id);
    });

    it("ignores an unknown column", () => {
      addColumn(definition);

      updateColumn("not-a-column", { title: "Renamed" });

      expect(columns.get()[0].title).toBe(definition.title);
    });
  });

  describe("removing", () => {
    it("drops the column", () => {
      const added = addColumn(definition);

      removeColumn(added.id);

      expect(columns.get()).toEqual([]);
    });

    it("keeps the other columns", () => {
      const first = addColumn({ ...definition, title: "First" });

      addColumn({ ...definition, title: "Second" });
      removeColumn(first.id);

      expect(columns.get().map((column) => column.title)).toEqual(["Second"]);
    });

    it("clears an anchor that pointed at the removed column", () => {
      const anchor = addColumn({ ...definition, title: "Anchor" });

      addColumn({ ...definition, title: "Anchored", after: anchor.id });
      removeColumn(anchor.id);

      expect(columns.get()[0].after).toBeUndefined();
    });

    it("leaves an anchor that pointed elsewhere", () => {
      const first = addColumn({ ...definition, title: "First" });

      addColumn({ ...definition, title: "Second", after: "name" });
      removeColumn(first.id);

      expect(columns.get()[0].after).toBe("name");
    });

    it("ignores an unknown column", () => {
      addColumn(definition);

      removeColumn("not-a-column");

      expect(columns.get()).toHaveLength(1);
    });
  });
});
