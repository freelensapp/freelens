/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { beforeEach, describe, expect, it } from "vitest";
import directoryForLensLocalStorageInjectable from "../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

describe("cluster - the key of the saved order of the sidebar items of an extension", () => {
  let applicationBuilder: ApplicationBuilder;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();
    applicationBuilder.setEnvironmentToClusterFrame();
    applicationBuilder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
    });
    applicationBuilder.extensions.enable({
      id: "some-extension-id",
      name: "some-extension-name",
      rendererOptions: {
        clusterPageMenus: [
          { id: "some-menu", title: "Some menu", components: { Icon: () => null } },
          { id: "some-other-menu", title: "Some other menu", components: { Icon: () => null } },
          { id: "some-child-menu", parentId: "some-menu", title: "Some child menu", components: { Icon: () => null } },
        ],
      },
    });
  });

  it("gives every top-level item of the extension the key of the extension, and none to a child", async () => {
    await applicationBuilder.render();

    const windowDi = applicationBuilder.applicationWindow.only.di;
    const items = windowDi
      .inject(sidebarItemsInjectable)
      .get()
      .filter((item) => item.id.startsWith("sidebar-item-some-extension-name-"));

    expect(items.map((item) => [item.id, item.orderKey])).toEqual([
      ["sidebar-item-some-extension-name-some-menu", "sidebar-item-some-extension-name"],
      ["sidebar-item-some-extension-name-some-other-menu", "sidebar-item-some-extension-name"],
    ]);
    expect(items[0].children.map((child) => [child.id, child.orderKey])).toEqual([
      ["sidebar-item-some-extension-name-some-child-menu", undefined],
    ]);
  });
});
