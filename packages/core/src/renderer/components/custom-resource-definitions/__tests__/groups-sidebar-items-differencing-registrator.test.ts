/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import { differencingRegistratorWithContentCheck } from "../groups-sidebar-items-differencing-registrator";

import type { DiContainerForInjection } from "@ogre-tools/injectable";

function createFakeDi() {
  const registered: string[] = [];
  const deregistered: string[] = [];
  const di = {
    register: (...injectables: { id: string }[]) => registered.push(...injectables.map((injectable) => injectable.id)),
    deregister: (...injectables: { id: string }[]) =>
      deregistered.push(...injectables.map((injectable) => injectable.id)),
  } as unknown as DiContainerForInjection;
  return { di, registered, deregistered };
}

function createSidebarItem(id: string, parentId: string, orderNumber: number, title = "Title") {
  return getInjectable({
    id,
    instantiate: () => ({ parentId, onClick: () => {}, title, orderNumber }),
    injectionToken: sidebarItemInjectionToken,
  });
}

describe("differencingRegistratorWithContentCheck", () => {
  it("does not re-register an item whose id and content are both unchanged", () => {
    const { di, registered, deregistered } = createFakeDi();
    const registrator = differencingRegistratorWithContentCheck(di);
    const previous = createSidebarItem("group-a", "parent", 0);
    const current = createSidebarItem("group-a", "parent", 0);

    registrator([current], [previous]);

    expect(registered).toEqual([]);
    expect(deregistered).toEqual([]);
  });

  it("re-registers an item whose id is unchanged but whose orderNumber changed", () => {
    const { di, registered, deregistered } = createFakeDi();
    const registrator = differencingRegistratorWithContentCheck(di);
    const previous = createSidebarItem("group-a", "parent", 0);
    const current = createSidebarItem("group-a", "parent", 1);

    registrator([current], [previous]);

    expect(deregistered).toEqual(["group-a"]);
    expect(registered).toEqual(["group-a"]);
  });

  it("re-registers an item whose id is unchanged but whose parentId changed", () => {
    const { di, registered, deregistered } = createFakeDi();
    const registrator = differencingRegistratorWithContentCheck(di);
    const previous = createSidebarItem("group-a", "old-parent", 0);
    const current = createSidebarItem("group-a", "new-parent", 0);

    registrator([current], [previous]);

    expect(deregistered).toEqual(["group-a"]);
    expect(registered).toEqual(["group-a"]);
  });

  it("still adds new ids and removes stale ones, unrelated to content diffing", () => {
    const { di, registered, deregistered } = createFakeDi();
    const registrator = differencingRegistratorWithContentCheck(di);
    const stale = createSidebarItem("group-old", "parent", 0);
    const added = createSidebarItem("group-new", "parent", 0);

    registrator([added], [stale]);

    expect(registered).toEqual(["group-new"]);
    expect(deregistered).toEqual(["group-old"]);
  });
});
