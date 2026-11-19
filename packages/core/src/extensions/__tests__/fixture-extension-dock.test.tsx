/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DiContextProvider } from "@ogre-tools/injectable-react";
import { act, fireEvent, render } from "@testing-library/react";
import { computed } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import activeKubernetesClusterInjectable from "../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterIdInjectable from "../../renderer/cluster-frame-context/hosted-cluster-id.injectable";
import { Dock } from "../../renderer/components/dock/dock";
import { TabKind } from "../../renderer/components/dock/dock/store";
import dockStoreInjectable from "../../renderer/components/dock/dock/store.injectable";
import { readExtensionDockTabData } from "../../renderer/components/dock/extension/params";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import { installExtensionApiGlobals } from "../../test-utils/install-extension-api-globals";
import extensionInjectable from "../extension-loader/extension/extension.injectable";

import type { CatalogEntity } from "../../common/catalog";
import type { KubernetesCluster } from "../../common/catalog-entities";
import type { Extension } from "../extension-loader/extension/extension.injectable";
import type { InstalledExtension } from "../installed-extension";
import type { LensRendererExtension } from "../lens-renderer-extension";

const fixtureBundlePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixture-extension/dist/renderer.js",
);

const installedFixture: InstalledExtension = {
  id: "/installed/freelens-fixture-extension/package.json",
  absolutePath: "/installed/freelens-fixture-extension",
  manifestPath: "/installed/freelens-fixture-extension/package.json",
  isManaged: true,
  isVerified: true,
  manifest: {
    name: "freelens-fixture-extension",
    version: "2.0.0-0",
    renderer: "./dist/renderer.js",
    engines: { freelens: "^2.0.0" },
  },
  isCompatible: true,
  isEnabled: true,
};

describe("dock tabs contributed by the built public-SDK fixture", () => {
  let registration: Extension | undefined;

  beforeEach(() => {
    registration = undefined;
  });

  afterEach(() => {
    act(() => registration?.deregister());
  });

  it("opens through the bundle's command, renders the bundle's hooks, and closes through its public props", async () => {
    const di = getDiForUnitTesting();
    const cluster = { getId: () => "fixture-cluster" } as KubernetesCluster;
    di.override(directoryForUserDataInjectable, () => "/fixture-user-data");
    di.override(hostedClusterIdInjectable, () => "fixture-cluster");
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(activeKubernetesClusterInjectable, () => computed(() => cluster));
    vi.spyOn(di.inject(catalogEntityRegistryInjectable), "getById").mockReturnValue({
      status: { active: true },
    } as CatalogEntity);
    Element.prototype.scrollIntoView = vi.fn();
    installExtensionApiGlobals();

    if (!existsSync(fixtureBundlePath)) {
      throw new Error("Build @freelensapp/fixture-extension before running the public-SDK dock contract");
    }

    // Native import consumes the built extension, which resolves only the host global.
    const fixture = (await import(/* @vite-ignore */ pathToFileURL(fixtureBundlePath).href)) as {
      default: new (installed: InstalledExtension) => LensRendererExtension;
    };
    const extension = new fixture.default(installedFixture);
    const store = di.inject(dockStoreInjectable);
    store.tabs = [];
    // Keep this fixture invocation dock-only: no other field can prewarm cluster eligibility.
    extension.statusBarItems = [];
    extension.kubeObjectDetailItems = [];
    extension.kubeObjectMenuItems = [];
    extension.customResources = [];
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Nothing has rendered and no registry getter has been used before the first command.
    extension.commands[0].action({} as never);
    const first = store.selectedTabId!;
    expect(store.getTabById(first)).toMatchObject({
      kind: TabKind.EXTENSION,
      title: "Fixture pod",
    });
    expect(readExtensionDockTabData(store.getTabById(first)?.extensionTab)).toEqual({
      version: 1,
      extensionName: "freelens-fixture-extension",
      typeId: "fixture-resource",
      params: { resource: "fixture-pod" },
    });

    const view = render(
      <DiContextProvider value={di}>
        <Dock />
      </DiContextProvider>,
    );
    expect(view.getByTestId(`fixture-dock-content-${first}`)).toHaveTextContent("fixture-pod");
    fireEvent.click(view.getByText("Dock count 0"));
    expect(view.getByText("Dock count 1")).toBeInTheDocument();

    let second: string;
    act(() => {
      second = extension.openDockTab("fixture-resource", { params: { resource: "other-pod" } });
    });
    expect(view.queryByTestId(`fixture-dock-content-${first}`)).not.toBeInTheDocument();
    expect(view.getByTestId(`fixture-dock-content-${second!}`)).toHaveTextContent("other-pod");
    expect(view.getByText("Dock count 0")).toBeInTheDocument();
    fireEvent.click(view.getByText("Close fixture dock tab"));
    expect(store.selectedTabId).toBe(first);
    expect(store.tabs).toHaveLength(1);
    expect(view.getByText("Dock count 0")).toBeInTheDocument();
  });
});
