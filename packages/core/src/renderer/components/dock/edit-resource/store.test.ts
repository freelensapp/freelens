/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EditResourceTabStore } from "./store";

import type { CreateStorage } from "../../../utils/create-storage/create-storage.injectable";
import type { DockTabStorageState } from "../dock-tab-store/dock-tab.store";
import type { EditingResource } from "./store";

describe("the storage of the edit resource tabs", () => {
  let store: EditResourceTabStore;
  let saved: DockTabStorageState<EditingResource>[];

  const resource = "/api/v1/namespaces/default/configmaps/some-name";

  beforeEach(() => {
    saved = [];

    const createStorage = ((_key: string, defaultValue: unknown) => ({
      get: () => defaultValue,
      set: (value: DockTabStorageState<EditingResource>) => saved.push(value),
    })) as unknown as CreateStorage;

    store = new EditResourceTabStore({ createStorage });
  });

  it("saves neither the YAML of the cluster nor a draft without changes", () => {
    store.setData("some-tab-id", { resource, firstDraft: "some-yaml", draft: "some-yaml" });

    expect(saved.at(-1)).toEqual({ "some-tab-id": { resource } });
  });

  it("saves a draft with changes not saved yet, without the YAML of the cluster", () => {
    store.setData("some-tab-id", { resource, firstDraft: "some-yaml", draft: "some-edited-yaml" });

    expect(saved.at(-1)).toEqual({ "some-tab-id": { resource, draft: "some-edited-yaml" } });
  });

  it("keeps both in memory", () => {
    store.setData("some-tab-id", { resource, firstDraft: "some-yaml", draft: "some-yaml" });

    expect(store.getData("some-tab-id")).toEqual({ resource, firstDraft: "some-yaml", draft: "some-yaml" });
  });
});
