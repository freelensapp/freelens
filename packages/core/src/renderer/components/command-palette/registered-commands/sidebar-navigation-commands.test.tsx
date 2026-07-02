/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { computed, runInAction } from "mobx";
import React from "react";
import { getApplicationBuilder } from "../../test-utils/get-application-builder";
import sidebarNavigationCommandsInjectable from "./sidebar-navigation-commands.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CommandContext } from "./commands";

const clusterContext = { entity: { kind: "KubernetesCluster" } } as CommandContext;
const nonClusterContext = { entity: { kind: "SomethingElse" } } as CommandContext;

const testGroupSidebarItemInjectable = getInjectable({
  id: "sidebar-item-test-group",
  instantiate: () => ({
    parentId: null,
    title: "Test Group",
    onClick: noop,
    orderNumber: 1000,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const visibleLeafSidebarItemInjectable = getInjectable({
  id: "sidebar-item-test-visible-leaf",
  instantiate: () => ({
    parentId: testGroupSidebarItemInjectable.id,
    title: "Visible Leaf",
    onClick: noop,
    isVisible: computed(() => true),
    orderNumber: 1,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const hiddenLeafSidebarItemInjectable = getInjectable({
  id: "sidebar-item-test-hidden-leaf",
  instantiate: () => ({
    parentId: testGroupSidebarItemInjectable.id,
    title: "Hidden Leaf",
    onClick: noop,
    isVisible: computed(() => false),
    orderNumber: 2,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const nonStringTitleSidebarItemInjectable = getInjectable({
  id: "sidebar-item-test-non-string-title",
  instantiate: () => ({
    parentId: null,
    title: React.createElement("span", null, "Not a string"),
    onClick: noop,
    orderNumber: 1001,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const zeroWidthTitleSidebarItemInjectable = getInjectable({
  id: "sidebar-item-test-zero-width",
  instantiate: () => ({
    parentId: null,
    title: "source\u200b.toolkit\u200b.fluxcd\u200b.io",
    onClick: noop,
    orderNumber: 1002,
  }),
  injectionToken: sidebarItemInjectionToken,
});

describe("command-palette - navigation commands derived from the sidebar", () => {
  let windowDi: DiContainer;

  beforeEach(async () => {
    const builder = getApplicationBuilder();

    builder.setEnvironmentToClusterFrame();

    builder.beforeWindowStart(({ windowDi: di }) => {
      runInAction(() => {
        di.register(testGroupSidebarItemInjectable);
        di.register(visibleLeafSidebarItemInjectable);
        di.register(hiddenLeafSidebarItemInjectable);
        di.register(nonStringTitleSidebarItemInjectable);
        di.register(zeroWidthTitleSidebarItemInjectable);
      });
    });

    await builder.render();

    windowDi = builder.applicationWindow.only.di;
  });

  const getCommands = () => windowDi.inject(sidebarNavigationCommandsInjectable).get();

  it("emits a command for a navigable leaf item with a breadcrumb title", () => {
    const command = getCommands().find((c) => c.id === "navigation.sidebar-item-test-visible-leaf");

    expect(command?.title).toBe("Test Group: Visible Leaf");
  });

  it("does not emit a command for a grouping node with children", () => {
    const command = getCommands().find((c) => c.id === "navigation.sidebar-item-test-group");

    expect(command).toBeUndefined();
  });

  it("skips items whose title is not a plain string", () => {
    const command = getCommands().find((c) => c.id === "navigation.sidebar-item-test-non-string-title");

    expect(command).toBeUndefined();
  });

  it("strips zero-width spaces from titles", () => {
    const command = getCommands().find((c) => c.id === "navigation.sidebar-item-test-zero-width");

    expect(command?.title).toBe("source.toolkit.fluxcd.io");
  });

  it("is active only within an active cluster when the sidebar item is visible", () => {
    const command = getCommands().find((c) => c.id === "navigation.sidebar-item-test-visible-leaf");

    expect(command?.isActive?.(clusterContext)).toBe(true);
    expect(command?.isActive?.(nonClusterContext)).toBe(false);
  });

  it("is not active when the sidebar item is not visible", () => {
    const command = getCommands().find((c) => c.id === "navigation.sidebar-item-test-hidden-leaf");

    expect(command?.isActive?.(clusterContext)).toBe(false);
  });
});
