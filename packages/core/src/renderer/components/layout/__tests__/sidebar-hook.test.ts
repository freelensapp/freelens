/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable } from "mobx";
import { describe, expect, it } from "vitest";
import useSidebarHook from "../sidebar-hook";

import type { UserPreferencesState } from "../../../../features/user-preferences/common/state.injectable";

const preferencesWith = (order: Record<string, number>) =>
  observable({ clusterPageMenuOrder: order }) as unknown as UserPreferencesState;

// The keys of the saved order, from the first to the last.
const savedKeys = (preferences: UserPreferencesState) =>
  Object.entries(preferences.clusterPageMenuOrder ?? {})
    .sort(([, valueA], [, valueB]) => valueA - valueB)
    .map(([key]) => key);

const item = (id: string, orderKey?: string) => ({ id, orderKey });

describe("saving the order of the cluster sidebar", () => {
  it("moves the dragged item before the one it is dropped on, when the saved order has a key that no item reads", () => {
    const userPreferences = preferencesWith({
      "sidebar-item-cluster-overview": 10,
      "sidebar-item-nodes": 20,
      "sidebar-item-removed-extension": 25,
      "sidebar-item-workloads": 30,
      "sidebar-item-config": 40,
    });

    useSidebarHook({ userPreferences }).saveOrderInfo(item("sidebar-item-config"), item("sidebar-item-nodes"));

    expect(savedKeys(userPreferences)).toEqual([
      "sidebar-item-cluster-overview",
      "sidebar-item-config",
      "sidebar-item-nodes",
      "sidebar-item-removed-extension",
      "sidebar-item-workloads",
    ]);
  });

  it("moves an item dragged down after the one it is dropped on", () => {
    const userPreferences = preferencesWith({
      "sidebar-item-cluster-overview": 10,
      "sidebar-item-nodes": 20,
      "sidebar-item-removed-extension": 25,
      "sidebar-item-workloads": 30,
      "sidebar-item-config": 40,
    });

    useSidebarHook({ userPreferences }).saveOrderInfo(item("sidebar-item-nodes"), item("sidebar-item-config"));

    expect(savedKeys(userPreferences)).toEqual([
      "sidebar-item-cluster-overview",
      "sidebar-item-removed-extension",
      "sidebar-item-workloads",
      "sidebar-item-config",
      "sidebar-item-nodes",
    ]);
  });

  it("moves the top-level items of an extension together, by the key they share", () => {
    const userPreferences = preferencesWith({
      "sidebar-item-cluster-overview": 10,
      "sidebar-item-nodes": 20,
      "sidebar-item-some-extension": 30,
      "sidebar-item-events": 40,
    });

    useSidebarHook({ userPreferences }).saveOrderInfo(
      item("sidebar-item-some-extension-id-second-menu", "sidebar-item-some-extension"),
      item("sidebar-item-nodes"),
    );

    expect(savedKeys(userPreferences)).toEqual([
      "sidebar-item-cluster-overview",
      "sidebar-item-some-extension",
      "sidebar-item-nodes",
      "sidebar-item-events",
    ]);
  });

  it("leaves the order alone when an item is dropped on another item of the same extension", () => {
    const order = {
      "sidebar-item-nodes": 20,
      "sidebar-item-some-extension": 30,
    };
    const userPreferences = preferencesWith({ ...order });

    useSidebarHook({ userPreferences }).saveOrderInfo(
      item("sidebar-item-some-extension-id-second-menu", "sidebar-item-some-extension"),
      item("sidebar-item-some-extension-id-first-menu", "sidebar-item-some-extension"),
    );

    expect(userPreferences.clusterPageMenuOrder).toEqual(order);
  });

  it("saves the key of an item that has none yet last, where its item is, before moving it", () => {
    const userPreferences = preferencesWith({
      "sidebar-item-cluster-overview": 10,
      "sidebar-item-nodes": 20,
    });
    const extensionItem = item("sidebar-item-some-extension-id-menu", "sidebar-item-some-extension");

    useSidebarHook({ userPreferences }).saveOrderInfo(extensionItem, item("sidebar-item-nodes"), [
      item("sidebar-item-cluster-overview"),
      item("sidebar-item-nodes"),
      extensionItem,
    ]);

    expect(savedKeys(userPreferences)).toEqual([
      "sidebar-item-cluster-overview",
      "sidebar-item-some-extension",
      "sidebar-item-nodes",
    ]);
  });
});
